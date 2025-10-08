import asyncio
import time
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Auction, Bid, Player, UserTeam, TeamComposition, User, AuctionParticipant, Transaction
import crud
import datetime

class AuctionCountdownManager:
    def __init__(self):
        self.active_auctions = {}
        self.running = False
    
    async def start_countdown_manager(self):
        """Start the background countdown manager"""
        self.running = True
        while self.running:
            await self.check_auctions()
            await asyncio.sleep(1)  # Check every second
    
    def stop_countdown_manager(self):
        """Stop the countdown manager"""
        self.running = False
    
    async def check_auctions(self):
        """Check all live auctions and manage their countdowns"""
        db = next(get_db())
        try:
            # Get all live auctions
            live_auctions = db.query(Auction).filter(Auction.status == 'live').all()
            
            for auction in live_auctions:
                if auction.countdown <= 0:
                    # Countdown expired, finalize current player
                    await self.finalize_current_player(db, auction)
                else:
                    # Decrement countdown
                    auction.countdown -= 1
                    auction.updated_at = datetime.datetime.utcnow()
            
            db.commit()
        except Exception as e:
            print(f"Error in countdown manager: {e}")
            db.rollback()
        finally:
            db.close()
    
    async def finalize_current_player(self, db: Session, auction: Auction):
        """Finalize the current player when countdown expires"""
        if not auction.current_player_id:
            return
        
        # Get highest bid for current player
        highest_bid = db.query(Bid).filter(
            Bid.auction_id == auction.id,
            Bid.player_id == auction.current_player_id
        ).order_by(Bid.bid_amount.desc(), Bid.created_at.asc()).first()
        
        if highest_bid:
            # Assign player to the highest bidder
            user_team = UserTeam(
                user_id=highest_bid.user_id,
                auction_id=auction.id,
                player_id=auction.current_player_id,
                purchase_price=highest_bid.bid_amount,
                acquired_round=auction.current_round
            )
            db.add(user_team)
            
            # Create a transaction record for the finalization debit; do not modify stored wallet_balance here.
            user = db.query(User).filter(User.id == highest_bid.user_id).first()
            if user:
                tx = Transaction(user_id=highest_bid.user_id, auction_id=auction.id, player_id=auction.current_player_id, amount=-highest_bid.bid_amount, type='debit')
                db.add(tx)
            
            # Update team composition
            player = db.query(Player).filter(Player.id == auction.current_player_id).first()
            if player:
                team_composition = db.query(TeamComposition).filter(
                    TeamComposition.user_id == highest_bid.user_id,
                    TeamComposition.auction_id == auction.id
                ).first()
                
                if not team_composition:
                    team_composition = TeamComposition(
                        user_id=highest_bid.user_id,
                        auction_id=auction.id
                    )
                    db.add(team_composition)
                
                # Update role counts
                player_role = player.role.lower()
                if 'batsman' in player_role:
                    team_composition.batsmen_count += 1
                elif 'bowler' in player_role:
                    team_composition.bowlers_count += 1
                elif 'wicket' in player_role:
                    team_composition.wicket_keepers_count += 1
                elif 'all' in player_role and 'rounder' in player_role:
                    team_composition.all_rounders_count += 1
                
                team_composition.total_players += 1
                team_composition.updated_at = datetime.datetime.utcnow()
                
                # Mark player as unavailable
                player.is_available = False
            
            print(f"Player {player.player_name if player else 'Unknown'} sold to {user.username if user else 'Unknown'} for ₹{highest_bid.bid_amount} cr")
        else:
            # No bids: decide whether to requeue based on team vacancies
            player = db.query(Player).filter(Player.id == auction.current_player_id).first()
            # Count players per user for this auction
            user_player_counts = db.query(UserTeam.user_id, func.count(UserTeam.player_id).label('count')).filter(UserTeam.auction_id == auction.id).group_by(UserTeam.user_id).all()
            requeue = any((up.count or 0) < 15 for up in user_player_counts)

            if requeue:
                # Keep player available and rotate to next available player != current
                if player:
                    player.is_available = True
                print(f"Player {player.player_name if player else auction.current_player_id} requeued (no bids) due to vacancies")
            else:
                # No requeue: mark as unsold
                if player:
                    player.is_available = False
                print(f"Player {player.player_name if player else auction.current_player_id} went unsold")
        
        # Get next available player
        next_player = db.query(Player).filter(Player.is_available == True).first()
        
        if next_player:
            # Move to next player
            auction.current_player_id = next_player.id
            auction.current_round += 1
            auction.countdown = 15  # Reset countdown for new player
            print(f"Next player: {next_player.player_name}")
        else:
            # No more players, end auction
            auction.status = 'ended'
            auction.ended_at = datetime.datetime.utcnow()
            auction.current_player_id = None
            print(f"Auction {auction.id} has ended - no more players available")
        
        auction.updated_at = datetime.datetime.utcnow()

# Global countdown manager instance
countdown_manager = AuctionCountdownManager()
