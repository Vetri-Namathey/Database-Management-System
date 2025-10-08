from sqlalchemy.orm import Session
from models import User, Player, PlayerPerformance, Auction, Bid, UserTeam, AuctionParticipant, Transaction
from typing import Optional, List
import datetime
from sqlalchemy import desc

def create_user(db: Session, user_data: dict) -> User:
    user = User(**user_data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def update_user_wallet(db: Session, user_id: int, amount: float) -> Optional[User]:
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.wallet_balance += amount
        db.commit()
        db.refresh(user)
    return user

def get_all_players(db: Session, filters: dict = {}) -> List[Player]:
    query = db.query(Player)
    if 'role' in filters:
        query = query.filter(Player.role == filters['role'])
    if 'nationality' in filters:
        query = query.filter(Player.nationality == filters['nationality'])
    if filters.get('available_only'):
        query = query.filter(Player.is_available == True)
    query = query.order_by(Player.base_price.desc(), Player.player_name.asc())
    if 'limit' in filters:
        query = query.limit(filters['limit'])
        if 'offset' in filters:
            query = query.offset(filters['offset'])
    return query.all()

def find_player_by_id(db: Session, player_id: int) -> Optional[Player]:
    return db.query(Player).filter(Player.id == player_id).first()

def update_player_availability(db: Session, player_id: int, is_available: bool):
    player = db.query(Player).filter(Player.id == player_id).first()
    if player:
        player.is_available = is_available
        db.commit()
        db.refresh(player)
    return player

# Auction CRUD operations
def create_auction(db: Session, auction_data: dict) -> Auction:
    auction = Auction(**auction_data)
    db.add(auction)
    db.commit()
    db.refresh(auction)
    return auction

def get_auction_by_id(db: Session, auction_id: int) -> Optional[Auction]:
    return db.query(Auction).filter(Auction.id == auction_id).first()

def get_all_auctions(db: Session) -> List[Auction]:
    return db.query(Auction).order_by(Auction.created_at.desc()).all()

def update_auction_status(db: Session, auction_id: int, status: str) -> Optional[Auction]:
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if auction:
        auction.status = status
        auction.updated_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(auction)
    return auction

def delete_auction(db: Session, auction_id: int) -> bool:
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if auction:
        db.delete(auction)
        db.commit()
        return True
    return False

# Auction Participant CRUD operations
def add_auction_participant(db: Session, auction_id: int, user_id: int) -> AuctionParticipant:
    participant = AuctionParticipant(auction_id=auction_id, user_id=user_id)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant

def get_auction_participants(db: Session, auction_id: int) -> List[AuctionParticipant]:
    return db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == auction_id).all()

def get_auction_participant_count(db: Session, auction_id: int) -> int:
    return db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == auction_id).count()

# Bid CRUD operations
def create_bid(db: Session, bid_data: dict) -> Bid:
    bid = Bid(**bid_data)
    db.add(bid)
    db.commit()
    db.refresh(bid)
    return bid

def get_auction_bids(db: Session, auction_id: int) -> List[Bid]:
    return db.query(Bid).filter(Bid.auction_id == auction_id).order_by(Bid.created_at.desc()).all()

def get_highest_bid_for_player(db: Session, auction_id: int, player_id: int) -> Optional[Bid]:
    return db.query(Bid).filter(
        Bid.auction_id == auction_id,
        Bid.player_id == player_id
    ).order_by(Bid.bid_amount.desc()).first()

# Team CRUD operations
def add_player_to_team(db: Session, team_data: dict) -> UserTeam:
    team_member = UserTeam(**team_data)
    db.add(team_member)
    db.commit()
    db.refresh(team_member)
    return team_member

def get_user_team(db: Session, user_id: int, auction_id: int) -> List[UserTeam]:
    return db.query(UserTeam).filter(
        UserTeam.user_id == user_id,
        UserTeam.auction_id == auction_id
    ).all()

def get_user_total_spent(db: Session, user_id: int, auction_id: int) -> float:
    result = db.query(UserTeam).filter(
        UserTeam.user_id == user_id,
        UserTeam.auction_id == auction_id
    ).all()
    return sum(member.purchase_price for member in result) if result else 0.0


def create_transaction(db: Session, user_id: int, auction_id: int | None, player_id: int | None, amount: float, type: str = 'debit'):
    """Create a transaction record for wallet changes."""
    tx = Transaction(user_id=user_id, auction_id=auction_id, player_id=player_id, amount=amount, type=type)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def get_transactions_by_user(db: Session, user_id: int, limit: int = 50):
    return db.query(Transaction).filter(Transaction.user_id == user_id).order_by(desc(Transaction.created_at)).limit(limit).all()
