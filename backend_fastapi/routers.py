# Player details endpoint
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db , get_db_native
from finalize_cache import set_finalization
import crud
import psycopg2
from pydantic import BaseModel, EmailStr, constr
from typing import Optional
from passlib.hash import bcrypt
import datetime
from models import User, Auction, Bid, Player, AuctionParticipant, TeamComposition, UserTeam, Player, UserTeam, PlayerQuit, PlayerPerformance, Transaction, Leaderboard

from sqlalchemy.orm import joinedload
router = APIRouter()


def can_user_add_player(db: Session, user_id: int, auction_id: int, player_role: str) -> bool:
    """Return True if the user can add a player of player_role to their team for auction_id.
    Enforces: 5 batsmen, 6 bowlers, 2 wicket-keepers, 2 all-rounders, total 15.
    """
    # Normalize role
    role = (player_role or '').lower()

    comp = db.query(TeamComposition).filter(
        TeamComposition.user_id == user_id,
        TeamComposition.auction_id == auction_id
    ).first()

    # If no composition, treat as empty
    batsmen = bowlers = wk = allr = total = 0
    if comp:
        batsmen = comp.batsmen_count or 0
        bowlers = comp.bowlers_count or 0
        wk = comp.wicket_keepers_count or 0
        allr = comp.all_rounders_count or 0
        total = comp.total_players or 0

    # total players limit
    if total >= 15:
        return False

    if ('batsman' in role or 'batter' in role) and batsmen >= 5:
        return False
    if 'bowler' in role and bowlers >= 6:
        return False
    if ('wicket' in role or 'keeper' in role) and wk >= 2:
        return False
    if ('all' in role and 'rounder' in role) or 'all-rounder' in role:
        if allr >= 2:
            return False

    return True
@router.get('/players/{player_id}')
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get player performance data if available
    performance = db.query(PlayerPerformance).filter(PlayerPerformance.player_id == player_id).first()
    
    response = {
        'success': True,
        'player': {
            'id': player.id,
            'player_name': player.player_name,
            'role': player.role,
            'nationality': player.nationality,
            'base_price': player.base_price,
            'is_available': player.is_available,
        }
    }
    
    # Add performance data if available
    if performance:
        response['player'].update({
            'runs_scored': performance.runs_scored,
            'wickets_taken': performance.wickets_taken,
            'catches': performance.catches,
            'strike_rate': performance.strike_rate,
            'economy_rate': performance.economy_rate,
            'points_earned': performance.points_earned
        })
    
    return response
# Admin dashboard endpoint


@router.get('/admin/dashboard')
def admin_dashboard(db: Session = Depends(get_db)):
    # Example stats (replace with real queries as needed)
    total_users = db.query(User).filter(User.role != 'admin').count()
    active_users = db.query(User).filter(User.role != 'admin').count()  # You can filter by is_active if you add that field
    total_auctions = db.query(Auction).count()
    active_auctions = db.query(Auction).filter_by(status='live').count()
    total_bids = db.query(Bid).count()
    total_revenue = db.query(Bid).with_entities(Bid.bid_amount).all()
    total_revenue = sum([b[0] for b in total_revenue]) if total_revenue else 0

    # Recent auctions (last 5)
    recent_auctions = db.query(Auction).order_by(Auction.created_at.desc()).limit(5).all()
    recent_auctions = [
        {
            'id': a.id,
            'name': a.name,
            'status': a.status,
            'participants_count': 0,  # Add real count if available
            'created_at': a.created_at.isoformat() if a.created_at else None
        } for a in recent_auctions
    ]

    # Recent users (last 5, excluding admins)
    recent_users = db.query(User).filter(User.role != 'admin').order_by(User.created_at.desc()).limit(5).all()
    recent_users = [
        {
            'id': u.id,
            'username': u.username,
            'full_name': u.full_name,
            'team_name': u.team_name,
            'created_at': u.created_at.isoformat() if u.created_at else None,
            'is_active': u.is_active
        } for u in recent_users
    ]

    return {
        'stats': {
            'total_users': total_users,
            'active_users': active_users,
            'total_auctions': total_auctions,
            'active_auctions': active_auctions,
            'total_bids': total_bids,
            'total_revenue': total_revenue
        },
        'recent_auctions': recent_auctions,
        'recent_users': recent_users
    }
# Dashboard endpoint for user


# Get user's team endpoint
@router.get('/users/{user_id}/team')
def get_user_team(user_id: int, auction_id: int = None, db: Session = Depends(get_db)):
    """Get a user's team with detailed player information and team composition stats"""
    
    # Check if user exists
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If auction_id not provided, try to get the latest completed auction
    if not auction_id:
        latest_auction = db.query(Auction).filter(Auction.status == 'ended').order_by(Auction.ended_at.desc()).first()
        if latest_auction:
            auction_id = latest_auction.id
        else:
            # If no completed auction, try to get any auction
            any_auction = db.query(Auction).order_by(Auction.created_at.desc()).first()
            if any_auction:
                auction_id = any_auction.id
            else:
                return {
                    "team_name": user.team_name,
                    "players": [],
                    "team_stats": {
                        "total_players": 0,
                        "total_spent": 0,
                        "remaining_budget": 100,  # Default budget
                        "batsmen": 0,
                        "bowlers": 0,
                        "wicket_keepers": 0,
                        "all_rounders": 0
                    }
                }
    
    # Get user's team players
    user_team_entries = db.query(UserTeam).filter(
        UserTeam.user_id == user_id,
        UserTeam.auction_id == auction_id
    ).all()
    
    # Get team composition
    team_comp = db.query(TeamComposition).filter(
        TeamComposition.user_id == user_id,
        TeamComposition.auction_id == auction_id
    ).first()
    
    # Calculate total spent
    total_spent = sum(entry.purchase_price for entry in user_team_entries) if user_team_entries else 0
    
    # Get player details for each player in the team
    players = []
    for entry in user_team_entries:
        player = db.query(Player).filter(Player.id == entry.player_id).first()
        if player:
            player_perf = db.query(PlayerPerformance).filter(
                PlayerPerformance.player_id == player.id
            ).first()
            
            player_data = {
                "id": player.id,
                "name": player.player_name,
                "role": player.role,
                "nationality": player.nationality,
                "price": entry.purchase_price,
                "base_price": player.base_price,
                "acquired_round": entry.acquired_round,
            }
            
            # Add performance data if available
            if player_perf:
                player_data.update({
                    "runs_scored": player_perf.runs_scored,
                    "wickets_taken": player_perf.wickets_taken,
                    "strike_rate": player_perf.strike_rate,
                    "economy_rate": player_perf.economy_rate,
                    "points": player_perf.points_earned,
                })
            
            # Calculate a simple rating based on price and role
            # This is a placeholder - real ratings would be calculated differently
            base_rating = 5.0  # Base rating out of 10
            price_factor = min(1.0, entry.purchase_price / 20.0) * 3.0  # Up to 3 points for price
            role_bonus = {
                "batsman": 0.5,
                "bowler": 0.5,
                "all-rounder": 1.0,
                "wicket-keeper": 0.7
            }.get(player.role.lower(), 0)
            
            # Add points for performance if available
            perf_bonus = 0
            if player_perf:
                if player_perf.points_earned:
                    perf_bonus = min(2.0, player_perf.points_earned / 50.0)  # Up to 2 points for performance
            
            player_data["rating"] = round(min(10.0, base_rating + price_factor + role_bonus + perf_bonus), 1)
            
            players.append(player_data)
    
    # Prepare response
    response = {
        "team_name": user.team_name if user.team_name else "My Team",
        "players": players,
        "team_stats": {
            "total_players": len(players),
            "total_spent": total_spent,
            "remaining_budget": max(0, 100 - total_spent),  # Assuming 100 cr budget
        }
    }
    
    # Add team composition stats if available
    if team_comp:
        response["team_stats"].update({
            "batsmen": team_comp.batsmen_count,
            "bowlers": team_comp.bowlers_count,
            "wicket_keepers": team_comp.wicket_keepers_count,
            "all_rounders": team_comp.all_rounders_count,
        })
    else:
        # Calculate composition from player roles if TeamComposition doesn't exist
        batsmen = sum(1 for p in players if p["role"].lower() == "batsman")
        bowlers = sum(1 for p in players if p["role"].lower() == "bowler")
        wicket_keepers = sum(1 for p in players if p["role"].lower() == "wicket-keeper")
        all_rounders = sum(1 for p in players if p["role"].lower() == "all-rounder")
        
        response["team_stats"].update({
            "batsmen": batsmen,
            "bowlers": bowlers,
            "wicket_keepers": wicket_keepers,
            "all_rounders": all_rounders,
        })
    
    return response

# Pydantic schema for registration
from typing import Annotated
from pydantic import StringConstraints

@router.get('/users/dashboard')
def user_dashboard(request: Request, db: Session = Depends(get_db)):
    # Get user from localStorage (frontend) or session (if you want to support sessions)
    # For now, require username as a query param or from frontend user state
    username = request.query_params.get('username')
    if not username:
        return {"success": False, "message": "Username required"}
    user = crud.get_user_by_username(db, username)
    if not user:
        return {"success": False, "message": "User not found"}
    
    # Calculate remaining main wallet balance (6500 - transferred amounts)
    credit_transactions = [t for t in crud.get_transactions_by_user(db, user.id) if t.type == 'credit' and t.auction_id is None]
    total_credits = sum(t.amount for t in credit_transactions)
    remaining_main_balance = 6500 - total_credits
    
    # Example dashboard data (customize as needed)
    dashboard = {
        "wallet_balance": remaining_main_balance,  # Show main wallet balance in dashboard
        "team_summary": {
            "total_players": 0,
            "total_spent": 0,
            "remaining_budget": user.wallet_balance,  # Show auction wallet balance for bidding budget
            "by_role": {}
        },
        "active_auction": None,
        "recent_activity": []
    }
    return dashboard





# Profile management
@router.get('/users')
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.full_name,
            'team_name': user.team_name,
            'role': user.role,
            'wallet_balance': user.wallet_balance,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'is_active': user.is_active
        } for user in users
    ]

@router.get('/admin/analytics')
def get_analytics(db: Session = Depends(get_db)):
    # Get basic stats
    total_users = db.query(User).filter(User.role != 'admin').count()
    # Active users (respect `is_active` flag)
    active_users = db.query(User).filter(User.role != 'admin', User.is_active == True).count()

    # Auctions
    total_auctions = db.query(Auction).count()
    live_auctions = db.query(Auction).filter_by(status='live').count()

    # Bids and revenue
    total_bids = db.query(Bid).count()
    total_revenue_rows = db.query(Bid).with_entities(Bid.bid_amount).all()
    total_revenue = sum([b[0] for b in total_revenue_rows]) if total_revenue_rows else 0

    # Avg participants per auction (compute across auctions)
    auction_participant_counts = []
    auctions = db.query(Auction).all()
    for a in auctions:
        count = db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == a.id).count()
        auction_participant_counts.append(count)
    avg_participants = (sum(auction_participant_counts) / len(auction_participant_counts)) if auction_participant_counts else 0

    # Monthly revenue (last 6 months)
    now = datetime.datetime.utcnow()
    revenue_chart = []
    for i in range(5, -1, -1):
        start = (now.replace(day=1) - datetime.timedelta(days=30 * i)).replace(day=1)
        # naive month window end: next month start
        end_month = (start + datetime.timedelta(days=32)).replace(day=1)
        month_revenue = db.query(Bid).filter(Bid.created_at >= start, Bid.created_at < end_month).with_entities(func.sum(Bid.bid_amount)).scalar() or 0
        revenue_chart.append({'name': start.strftime('%b %Y'), 'value': float(month_revenue)})

    # User distribution
    inactive_users = db.query(User).filter(User.role != 'admin', User.is_active == False).count()
    # New users this month
    month_start = now.replace(day=1)
    new_this_month = db.query(User).filter(User.created_at >= month_start, User.role != 'admin').count()

    user_chart = [
        {'name': 'Active', 'value': active_users},
        {'name': 'Inactive', 'value': inactive_users},
        {'name': 'New This Month', 'value': new_this_month}
    ]

    # Auction categories (by status)
    auction_chart = []
    status_counts = db.query(Auction.status, func.count(Auction.id)).group_by(Auction.status).all()
    for status, cnt in status_counts:
        auction_chart.append({'name': status, 'value': cnt})

    # Top bidders (sum of bid_amount by user) - top 5
    top_bidders = db.query(Bid.user_id, func.sum(Bid.bid_amount).label('spent')).group_by(Bid.user_id).order_by(func.sum(Bid.bid_amount).desc()).limit(5).all()
    top_bidders_list = []
    for user_id, spent in top_bidders:
        user = db.query(User).filter(User.id == user_id).first()
        top_bidders_list.append({'username': user.username if user else str(user_id), 'spent': float(spent)})

    # Success rate: percent of bids that resulted in winning (approx using user_teams entries vs bids)
    won_count = db.query(UserTeam).count()
    success_rate = (won_count / total_bids * 100) if total_bids > 0 else 0

    return {
        'revenue': {
            'total': float(total_revenue),
            'monthly': revenue_chart,
            'growth': 0
        },
        'users': {
            'total': total_users,
            'active': active_users,
            'newThisMonth': new_this_month,
            'retention': 0
        },
        'auctions': {
            'total': total_auctions,
            'completed': db.query(Auction).filter_by(status='completed').count(),
            'live': live_auctions,
            'avgParticipants': avg_participants
        },
        'bids': {
            'total': total_bids,
            'avgAmount': float(total_revenue / total_bids) if total_bids > 0 else 0,
            'topBidders': top_bidders_list,
            'successRate': success_rate
        },
        'charts': {
            'revenue': revenue_chart,
            'users': user_chart,
            'auctions': auction_chart
        }
    }

@router.get('/user/{username}')
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.full_name,
        'team_name': user.team_name,
        'role': user.role,
        'wallet_balance': user.wallet_balance,
        'created_at': user.created_at.isoformat() if user.created_at else None
    }

class UserUpdate(BaseModel):
    full_name: str = None
    email: EmailStr = None
    team_name: str = None
    current_password: str = None
    new_password: str = None

@router.put('/user/{username}')
def update_user_profile(username: str, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update basic info
    if user_update.full_name:
        user.full_name = user_update.full_name
    if user_update.email:
        user.email = user_update.email
    if user_update.team_name and user.role != 'admin':  # Don't update team_name for admins
        user.team_name = user_update.team_name
    
    # Handle password change
    if user_update.new_password:
        if not user_update.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")

        # Verify against stored password_hash (not a 'password' attribute)
        if not hasattr(user, 'password_hash') or not bcrypt.verify(user_update.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Store new password hash in password_hash field
        user.password_hash = bcrypt.hash(user_update.new_password)
    
    db.commit()
    db.refresh(user)
    
    return {"message": "Profile updated successfully"}

class UserCreate(BaseModel):
    username: Annotated[str, StringConstraints(min_length=3, max_length=32)]
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=6)]
    full_name: str
    team_name: str
    role: str = 'user'

# Pydantic schema for login
class UserLogin(BaseModel):
    username: str
    password: str

@router.post('/users')
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    if crud.get_user_by_username(db, user_data.username):
        raise HTTPException(status_code=400, detail='Username already exists')
    # Only allow 'admin' role if explicitly requested
    role = user_data.role if hasattr(user_data, 'role') else 'user'
    if role not in ['user', 'admin']:
        raise HTTPException(status_code=400, detail='Invalid role')
    hashed_password = bcrypt.hash(user_data.password)
    user_dict = user_data.dict()
    user_dict['password_hash'] = hashed_password
    user_dict.pop('password')
    # If registering as admin, ensure no team is assigned
    if role == 'admin':
        user_dict['team_name'] = None
        user_dict['role'] = 'admin'
    user = crud.create_user(db, user_dict)
    return user

## Removed duplicate/invalid login_user definition
@router.post('/auth/login')
def login_user(request: Request, login_data: UserLogin, db: Session = Depends(get_db)):
    # Get user by username from Postgres
    user = crud.get_user_by_username(db, login_data.username)
    if not user:
        return {"success": False, "message": "Invalid username or password"}
    # Allow admin login with plain text password for legacy admin accounts
    if user.role == 'admin':
        # Accept either bcrypt or plain text for admin
        hash_is_bcrypt = user.password_hash.startswith('$2') and len(user.password_hash) == 60
        if hash_is_bcrypt:
            try:
                if bcrypt.verify(login_data.password, user.password_hash):
                    pass
                elif user.password_hash == login_data.password:
                    pass
                else:
                    return {"success": False, "message": "Invalid username or password"}
            except Exception:
                # If hash is malformed, fallback to plain text
                if user.password_hash == login_data.password:
                    pass
                else:
                    return {"success": False, "message": "Invalid username or password"}
        else:
            if user.password_hash == login_data.password:
                pass
            else:
                return {"success": False, "message": "Invalid username or password"}
    else:
        # For non-admins, require valid bcrypt
        hash_is_bcrypt = user.password_hash.startswith('$2') and len(user.password_hash) == 60
        if not hash_is_bcrypt or not bcrypt.verify(login_data.password, user.password_hash):
            return {"success": False, "message": "Invalid username or password"}
    # On successful login, set session values so subsequent requests include the session
    try:
        # Store minimal session info
        request.session['user_id'] = user.id
        request.session['username'] = user.username
        request.session['role'] = user.role
    except Exception:
        # If session isn't available for some reason, continue without failing login
        print('Warning: failed to set session on login')

    # Return user data (exclude password_hash)
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "team_name": user.team_name,
        "role": user.role,
        "wallet_balance": user.wallet_balance,
        "is_active": True,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    return {"success": True, "user": user_dict}


# Endpoint to get current user from session
@router.get('/auth/me')
def get_current_user(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail='Not authenticated')
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "team_name": user.team_name,
        "role": user.role,
        "wallet_balance": user.wallet_balance,
        "is_active": True,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    return {"success": True, "user": user_dict}

# Endpoint to logout and clear session
@router.post('/auth/logout')
def logout_user(request: Request):
    request.session.clear()
    return {"success": True, "message": "Logged out successfully"}

@router.get('/users/{username}')
def get_user(username: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user


@router.get('/users/{user_id}/transactions')
def get_user_transactions(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    transactions = crud.get_transactions_by_user(db, user_id)
    return [
        {
            'id': t.id,
            'auction_id': t.auction_id,
            'player_id': t.player_id,
            'amount': t.amount,
            'type': t.type,
            'created_at': t.created_at.isoformat() if t.created_at else None
        } for t in transactions
    ]

@router.post('/users/{user_id}/add-money')
def add_money_to_wallet(user_id: int, request: dict, db: Session = Depends(get_db)):
    """Add money from main wallet to auction wallet"""
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    amount = request.get('amount', 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail='Amount must be greater than 0')
    
    # Calculate remaining main wallet balance
    # Main wallet starts with 6500, subtract all credit transactions (money added to auction wallet)
    credit_transactions = [t for t in crud.get_transactions_by_user(db, user_id) if t.type == 'credit' and t.auction_id is None]
    total_credits = sum(t.amount for t in credit_transactions)
    remaining_main_balance = 6500 - total_credits
    
    if amount > remaining_main_balance:
        raise HTTPException(
            status_code=400, 
            detail=f'Insufficient funds. Available main wallet balance: {remaining_main_balance:.2f}'
        )
    
    try:
        # Create credit transaction for adding money to auction wallet
        crud.create_transaction(
            db=db,
            user_id=user_id,
            auction_id=None,  # None indicates main wallet transaction
            player_id=None,
            amount=amount,
            type='credit'
        )
        
        # Update user's auction wallet balance
        updated_user = crud.update_user_wallet(db, user_id, amount)
        
        return {
            'success': True,
            'message': f'Successfully added {amount:.2f} to auction wallet',
            'new_auction_balance': updated_user.wallet_balance,
            'remaining_main_balance': remaining_main_balance - amount
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail='Failed to add money to wallet')

@router.get('/users/{user_id}/main-wallet-balance')
def get_main_wallet_balance(user_id: int, db: Session = Depends(get_db)):
    """Get remaining main wallet balance"""
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    
    # Calculate remaining main wallet balance
    # Main wallet starts with 6500, subtract all credit transactions (money added to auction wallet)
    credit_transactions = [t for t in crud.get_transactions_by_user(db, user_id) if t.type == 'credit' and t.auction_id is None]
    total_credits = sum(t.amount for t in credit_transactions)
    remaining_main_balance = 6500 - total_credits
    
    return {
        'main_wallet_balance': remaining_main_balance,
        'total_transferred': total_credits,
        'auction_wallet_balance': user.wallet_balance
    }

@router.get('/players')
def get_players(role: str = None, nationality: str = None, available_only: bool = False, limit: int = None, offset: int = None, db: Session = Depends(get_db)):
    filters = {}
    if role:
        filters['role'] = role
    if nationality:
        filters['nationality'] = nationality
    if available_only:
        filters['available_only'] = available_only
    if limit:
        filters['limit'] = limit
    if offset:
        filters['offset'] = offset
    players = crud.get_all_players(db, filters)
    return players

# Auction management endpoints
class AuctionCreate(BaseModel):
    name: str
    max_rounds: int = 5
    max_participants: int = 10
    min_participants: int = 2
    start_time: Optional[str] = None

@router.post('/auctions')
def create_auction(auction_data: AuctionCreate, db: Session = Depends(get_db_native)):
    # Make created_by nullable to avoid foreign key issues
    auction_dict = auction_data.dict()
    auction_dict['created_by'] = None  # Set to None to avoid foreign key constraint
    auction_dict['status'] = 'waiting'
    
    # Convert start_time string to datetime if provided
    if auction_dict.get('start_time'):
        from datetime import datetime
        try:
            # Parse ISO format datetime string
            auction_dict['start_time'] = datetime.fromisoformat(auction_dict['start_time'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            # If parsing fails, set to None
            auction_dict['start_time'] = None
    
    # Option 1: Using ORM (currently commented out)
    """
    auction = crud.create_auction(db, auction_dict)
    return {
        'id': auction.id,
        'name': auction.name,
        'status': auction.status,
        'max_rounds': auction.max_rounds,
        'max_participants': auction.max_participants,
        'min_participants': auction.min_participants,
        'current_participants': 0,
        'total_bids': 0,
        'highest_bid': 0,
        'start_time': auction.start_time.isoformat() if auction.start_time else None,
        'created_at': auction.created_at.isoformat() if auction.created_at else None,
        'created_by': 'admin'
    }
    """
    
    # Option 2: Using native SQL
    #conn =  get_db_native()
    from dotenv import load_dotenv
    import os
    load_dotenv()

    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    print(DATABASE_URL)
    conn = psycopg2.connect(
        DATABASE_URL
    )
    
    ndb = conn.cursor()
    ndb.execute(
        """
        INSERT INTO auctions (
            name, status, max_rounds, max_participants, min_participants,
            start_time, created_by, created_at
        ) VALUES (
            %s, %s, %s, %s, %s,
            %s, %s, %s
        ) RETURNING id
        """,
        (
            auction_dict["name"],
            auction_dict["status"],
            auction_dict["max_rounds"],
            auction_dict["max_participants"],
            auction_dict["min_participants"],
            auction_dict["start_time"],
            auction_dict["created_by"],
            datetime.utcnow())
    )

    auction_id = ndb.fetchone()[0]
    conn.commit()

    # Fetch the inserted auction
    ndb.execute(
        "SELECT id, name, status, max_rounds, max_participants, min_participants, start_time, created_at, created_by FROM auctions WHERE id = %s",
        (auction_id,)
    )
    auction_data = ndb.fetchone()
    conn.close()
    
    return {
        'id': auction_data[0],
        'name': auction_data[1],
        'status': auction_data[2],
        'max_rounds': auction_data[3],
        'max_participants': auction_data[4],
        'min_participants': auction_data[5],
        'current_participants': 0,
        'total_bids': 0,
        'highest_bid': 0,
        'start_time': auction_data[6].isoformat() if auction_data[6] else None,
        'created_at': auction_data[7].isoformat() if auction_data[7] else None,
        'created_by': auction_data[8] if auction_data[8] else 'admin'
    }

@router.get('/auctions')
def get_auctions(db: Session = Depends(get_db)):
    auctions = crud.get_all_auctions(db)
    auction_list = []
    
    for auction in auctions:
        # Get participant count
        participant_count = crud.get_auction_participant_count(db, auction.id)
        
        # Get total bids
        bids = crud.get_auction_bids(db, auction.id)
        total_bids = len(bids)
        highest_bid = max([bid.bid_amount for bid in bids]) if bids else 0
        
        auction_list.append({
            'id': auction.id,
            'name': auction.name,
            'status': auction.status,
            'max_rounds': auction.max_rounds,
            'max_participants': auction.max_participants,
            'min_participants': auction.min_participants,
            'current_participants': participant_count,
            'total_bids': total_bids,
            'highest_bid': highest_bid,
            'start_time': auction.start_time.isoformat() if auction.start_time else None,
            'created_at': auction.created_at.isoformat() if auction.created_at else None,
            'created_by': 'admin'
        })
    
    return auction_list

@router.get('/auctions/{auction_id}')
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    participant_count = crud.get_auction_participant_count(db, auction.id)
    bids = crud.get_auction_bids(db, auction.id)
    total_bids = len(bids)
    highest_bid = max([bid.bid_amount for bid in bids]) if bids else 0
    
    return {
        'id': auction.id,
        'name': auction.name,
        'status': auction.status,
        'max_rounds': auction.max_rounds,
        'max_participants': auction.max_participants,
        'min_participants': auction.min_participants,
        'current_participants': participant_count,
        'total_bids': total_bids,
        'highest_bid': highest_bid,
        'start_time': auction.start_time.isoformat() if auction.start_time else None,
        'created_at': auction.created_at.isoformat() if auction.created_at else None,
        'created_by': 'admin'
    }

@router.put('/auctions/{auction_id}/status')
def update_auction_status(auction_id: int, status: str, db: Session = Depends(get_db)):
    auction = crud.update_auction_status(db, auction_id, status)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    return {"message": f"Auction status updated to {status}"}

@router.delete('/auctions/{auction_id}')
def delete_auction(auction_id: int, db: Session = Depends(get_db)):
    success = crud.delete_auction(db, auction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    return {"message": "Auction deleted successfully"}

# Auction participation endpoints
class JoinAuctionRequest(BaseModel):
    user_id: int

@router.post('/auctions/{auction_id}/join')
def join_auction(auction_id: int, request: JoinAuctionRequest, db: Session = Depends(get_db)):
    user_id = request.user_id
    
    # Check if user exists
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive users cannot join auctions")
    
    # Check if auction exists
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    # Check if auction status is waiting
    if auction.status != 'waiting':
        raise HTTPException(status_code=400, detail="Auction is not accepting participants")
    
    # Check if user is already a participant
    participants = crud.get_auction_participants(db, auction_id)
    if any(p.user_id == user_id for p in participants):
        raise HTTPException(status_code=400, detail="User already joined this auction")
    
    # Check if auction is full
    if len(participants) >= auction.max_participants:
        raise HTTPException(status_code=400, detail="Auction is full")
    
    participant = crud.add_auction_participant(db, auction_id, user_id)
    return {"message": "Successfully joined auction"}

@router.get('/auctions/{auction_id}/participants')
def get_auction_participants(auction_id: int, db: Session = Depends(get_db)):
    participants = crud.get_auction_participants(db, auction_id)
    participant_list = []
    
    for participant in participants:
        user = crud.get_user_by_id(db, participant.user_id)
        if user:
            # Get user's team composition for this auction
            team_composition = db.query(TeamComposition).filter(
                TeamComposition.user_id == user.id,
                TeamComposition.auction_id == auction_id
            ).first()
            
            # Get user's team players for this auction
            user_team_entries = db.query(UserTeam).filter(
                UserTeam.user_id == user.id,
                UserTeam.auction_id == auction_id
            ).all()
            
            # Calculate total spent
            total_spent = sum(entry.purchase_price for entry in user_team_entries) if user_team_entries else 0
            
            # Get player details
            players = []
            for entry in user_team_entries:
                player = crud.find_player_by_id(db, entry.player_id)
                if player:
                    players.append({
                        'id': player.id,
                        'name': player.player_name,
                        'role': player.role,
                        'purchase_price': entry.purchase_price
                    })
            
            participant_list.append({
                'id': participant.id,
                'user_id': user.id,
                'username': user.username,
                'teamName': user.team_name,
                'walletBalance': user.wallet_balance,
                'is_active': user.is_active,
                'joinedAt': participant.joined_at.isoformat() if participant.joined_at else None,
                'team_composition': {
                    'total_players': team_composition.total_players if team_composition else 0,
                    'batsmen_count': team_composition.batsmen_count if team_composition else 0,
                    'bowlers_count': team_composition.bowlers_count if team_composition else 0,
                    'wicket_keepers_count': team_composition.wicket_keepers_count if team_composition else 0,
                    'all_rounders_count': team_composition.all_rounders_count if team_composition else 0,
                },
                'players': players,
                'total_spent': total_spent
            })
    
    return participant_list

# User status management endpoint
@router.put('/admin/users/{user_id}/status')
def toggle_user_status(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Toggle the status
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    return {
        "success": True, 
        "message": f"User {'activated' if user.is_active else 'deactivated'} successfully",
        "user": {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active
        }
    }

# Auction control endpoints
@router.post('/auctions/{auction_id}/start')
def start_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'waiting':
        raise HTTPException(status_code=400, detail="Auction can only be started from waiting status")
    
    # Get participants count
    participants_count = db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == auction_id).count()
    
    if participants_count < auction.min_participants:
        raise HTTPException(status_code=400, detail=f"Need at least {auction.min_participants} participants to start")
    
    # Get first available player for auction
    first_player = db.query(Player).filter(Player.is_available == True).first()
    if not first_player:
        raise HTTPException(status_code=400, detail="No players available for auction")
    
    # Start the auction
    auction.status = 'live'
    auction.started_at = datetime.datetime.utcnow()
    auction.current_player_id = first_player.id
    auction.current_round = 1
    auction.countdown = 15
    auction.current_round = 1
    
    # Get first available player
    first_player = db.query(Player).filter(Player.is_available == True).first()
    if first_player:
        auction.current_player_id = first_player.id
    
    db.commit()
    db.refresh(auction)
    
    return {"success": True, "message": "Auction started successfully", "auction": auction}

@router.post('/auctions/{auction_id}/pause')
def pause_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'live':
        raise HTTPException(status_code=400, detail="Can only pause live auctions")
    
    auction.status = 'paused'
    db.commit()
    db.refresh(auction)
    
    return {"success": True, "message": "Auction paused", "auction": auction}

@router.post('/auctions/{auction_id}/resume')
def resume_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'paused':
        raise HTTPException(status_code=400, detail="Can only resume paused auctions")
    
    auction.status = 'live'
    db.commit()
    db.refresh(auction)
    
    return {"success": True, "message": "Auction resumed", "auction": auction}

# DUPLICATE ENDPOINT REMOVED - Using the one with leaderboard auto-save at line 1253

# Team composition validation endpoint
@router.get('/users/{user_id}/team-composition/{auction_id}')
def get_team_composition(user_id: int, auction_id: int, db: Session = Depends(get_db)):
    composition = db.query(TeamComposition).filter(
        TeamComposition.user_id == user_id,
        TeamComposition.auction_id == auction_id
    ).first()
    
    if not composition:
        # Create initial composition if doesn't exist
        composition = TeamComposition(
            user_id=user_id,
            auction_id=auction_id,
            batsmen_count=0,
            bowlers_count=0,
            all_rounders_count=0,
            wicket_keepers_count=0,
            total_players=0
        )
        db.add(composition)
        db.commit()
        db.refresh(composition)
    
    return {
        "batsmen_count": composition.batsmen_count,
        "bowlers_count": composition.bowlers_count,
        "all_rounders_count": composition.all_rounders_count,
        "wicket_keepers_count": composition.wicket_keepers_count,
        "total_players": composition.total_players,
        "can_add_batsman": composition.batsmen_count < 5,
        "can_add_bowler": composition.bowlers_count < 6,
        "can_add_all_rounder": composition.all_rounders_count < 2,
        "can_add_wicket_keeper": composition.wicket_keepers_count < 2,
        "team_complete": composition.total_players >= 15
    }

# Bid validation endpoint
@router.post('/bids/validate')
def validate_bid(request: Request, db: Session = Depends(get_db)):
    data = request.json()
    user_id = data.get('user_id')
    auction_id = data.get('auction_id')
    player_id = data.get('player_id')
    bid_amount = data.get('bid_amount')
    
    # Get player details
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get team composition
    composition = db.query(TeamComposition).filter(
        TeamComposition.user_id == user_id,
        TeamComposition.auction_id == auction_id
    ).first()
    
    if not composition:
        composition = TeamComposition(
            user_id=user_id,
            auction_id=auction_id,
            batsmen_count=0,
            bowlers_count=0,
            all_rounders_count=0,
            wicket_keepers_count=0,
            total_players=0
        )
    
    # Check team limits based on player role
    role = player.role.lower()
    
    if composition.total_players >= 15:
        return {"valid": False, "reason": "Team is already complete (15 players)"}
    
    if role == 'batsman' and composition.batsmen_count >= 5:
        return {"valid": False, "reason": "Maximum batsmen limit reached (5/5)"}
    
    if role == 'bowler' and composition.bowlers_count >= 6:
        return {"valid": False, "reason": "Maximum bowlers limit reached (6/6)"}
    
    if role == 'all-rounder' and composition.all_rounders_count >= 2:
        return {"valid": False, "reason": "Maximum all-rounders limit reached (2/2)"}
    
    if role == 'wicket-keeper' and composition.wicket_keepers_count >= 2:
        return {"valid": False, "reason": "Maximum wicket-keepers limit reached (2/2)"}
    
    # Check user's effective auction budget derived from transactions and a fixed starting budget
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Determine starting budget (fixed 100 after reset semantics)
    DEFAULT_WALLET = 6500
    starting_budget = 100.0

    # Sum transactions for this user to derive credits/debits for auction activity
    txs = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    total_debits = sum([-t.amount for t in txs if t.amount < 0])
    total_credits = sum([t.amount for t in txs if t.amount > 0])
    effective_balance = starting_budget + total_credits - total_debits

    if effective_balance < bid_amount:
        return {"valid": False, "reason": f"Insufficient funds. Available: ₹{effective_balance} Cr"}
    
    return {"valid": True, "reason": "Bid is valid"}

# Auction control endpoints
@router.post('/auctions/{auction_id}/start')
def start_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'waiting':
        raise HTTPException(status_code=400, detail="Auction is not in waiting state")
    
    # Check if minimum participants are met
    participants = crud.get_auction_participants(db, auction_id)
    if len(participants) < auction.min_participants:
        raise HTTPException(status_code=400, detail=f"Minimum {auction.min_participants} participants required")
    
    # Start the auction
    auction.status = 'live'
    auction.started_at = datetime.datetime.utcnow()
    
    # Get first available player
    first_player = db.query(Player).filter(Player.is_available == True).first()
    if first_player:
        auction.current_player_id = first_player.id
    
    db.commit()
    db.refresh(auction)
    
    return {"success": True, "message": "Auction started successfully"}

@router.post('/auctions/{auction_id}/pause')
def pause_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'live':
        raise HTTPException(status_code=400, detail="Auction is not live")
    
    auction.status = 'paused'
    db.commit()
    db.refresh(auction)
    
    return {"success": True, "message": "Auction paused successfully"}

@router.post('/auctions/{auction_id}/resume')
def resume_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'paused':
        raise HTTPException(status_code=400, detail="Auction is not paused")
    
    auction.status = 'live'
    db.commit()
    db.refresh(auction)
    
    return {"success": True, "message": "Auction resumed successfully"}

@router.post('/auctions/{auction_id}/end')
def end_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status not in ['live', 'paused']:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    auction.status = 'ended'
    auction.ended_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(auction)
    
    # Automatically calculate and save efficiency-based leaderboard when auction ends
    try:
        success = calculate_and_save_leaderboard_internal(auction_id, db)
        if success:
            print(f"✅ Leaderboard automatically created for auction {auction_id}")
        else:
            print(f"⚠️ Leaderboard creation failed for auction {auction_id}")
    except Exception as e:
        # Log the error but don't fail the auction ending
        print(f"❌ Warning: Failed to save leaderboard for auction {auction_id}: {str(e)}")
    
    return {"success": True, "message": "Auction ended successfully"}

# Team composition validation endpoint
@router.get('/users/{user_id}/team-composition/{auction_id}')
def get_team_composition(user_id: int, auction_id: int, db: Session = Depends(get_db)):
    # Get user's team for this auction
    user_team = db.query(UserTeam).filter(
        UserTeam.user_id == user_id,
        UserTeam.auction_id == auction_id
    ).all()
    
    # Count by role
    composition = {
        'batsmen': 0,
        'bowlers': 0,
        'wicket_keepers': 0,
        'all_rounders': 0,
        'total': len(user_team)
    }
    
    for team_player in user_team:
        player = db.query(Player).filter(Player.id == team_player.player_id).first()
        if player:
            role = player.role.lower().replace('-', '_').replace(' ', '_')
            if 'batsman' in role:
                composition['batsmen'] += 1
            

            elif 'bowler' in role:
                composition['bowlers'] += 1
            elif 'wicket' in role or 'keeper' in role:
                composition['wicket_keepers'] += 1
            elif 'all' in role and 'rounder' in role:
                composition['all_rounders'] += 1
    
    # Check if team is complete
    is_complete = (
        composition['batsmen'] == 5 and
        composition['bowlers'] == 6 and
        composition['wicket_keepers'] == 2 and
        composition['all_rounders'] == 2
    )
    
    # Check what roles are still needed
    needed = {
        'batsmen': max(0, 5 - composition['batsmen']),
        'bowlers': max(0, 6 - composition['bowlers']),
        'wicket_keepers': max(0, 2 - composition['wicket_keepers']),
        'all_rounders': max(0, 2 - composition['all_rounders'])
    }
    
    return {
        'composition': composition,
        'is_complete': is_complete,
        'needed': needed,
        'max_allowed': {
            'batsmen': 5,
            'bowlers': 6,
            'wicket_keepers': 2,
            'all_rounders': 2,
            'total': 15
        }
    }

# Bid validation endpoint
@router.post('/auctions/{auction_id}/validate-bid')
def validate_bid(auction_id: int, user_id: int, player_id: int, db: Session = Depends(get_db)):
    # Get user's current team composition
    composition_data = get_team_composition(user_id, auction_id, db)
    
    # Get the player being bid on
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Check if team is already complete
    if composition_data['composition']['total'] >= 15:
        raise HTTPException(status_code=400, detail="Team is already complete (15 players)")
    
    # Check role-specific limits
    role = player.role.lower().replace('-', '_').replace(' ', '_')
    
    if 'batsman' in role and composition_data['composition']['batsmen'] >= 5:
        raise HTTPException(status_code=400, detail="Maximum batsmen limit reached (5)")
    elif 'bowler' in role and composition_data['composition']['bowlers'] >= 6:
        raise HTTPException(status_code=400, detail="Maximum bowlers limit reached (6)")
    elif ('wicket' in role or 'keeper' in role) and composition_data['composition']['wicket_keepers'] >= 2:
        raise HTTPException(status_code=400, detail="Maximum wicket-keepers limit reached (2)")
    elif ('all' in role and 'rounder' in role) and composition_data['composition']['all_rounders'] >= 2:
        raise HTTPException(status_code=400, detail="Maximum all-rounders limit reached (2)")
    
    return {"success": True, "message": "Bid is valid"}

# Admin auction creation route
@router.post('/admin/auction/create')
def create_admin_auction(auction_data: AuctionCreate, db: Session = Depends(get_db)):
    # For admin creation, we'll make created_by nullable for now
    auction_dict = auction_data.dict()
    auction_dict['created_by'] = None  # Make it nullable to avoid foreign key issues
    auction_dict['status'] = 'waiting'
    
    # Convert start_time string to datetime if provided
    if auction_dict.get('start_time'):
        from datetime import datetime
        try:
            # Parse ISO format datetime string
            auction_dict['start_time'] = datetime.fromisoformat(auction_dict['start_time'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            # If parsing fails, set to None
            auction_dict['start_time'] = None
    
    auction = crud.create_auction(db, auction_dict)
    return {
        'id': auction.id,
        'name': auction.name,
        'status': auction.status,
        'max_rounds': auction.max_rounds,
        'max_participants': auction.max_participants,
        'min_participants': auction.min_participants,
        'current_participants': 0,
        'total_bids': 0,
        'highest_bid': 0,
        'start_time': auction.start_time.isoformat() if auction.start_time else None,
        'created_at': auction.created_at.isoformat() if auction.created_at else None,
        'created_by': 'admin'
    }


# Admin: Reset auction state endpoint (destructive - guarded by RESET_SECRET)
@router.post('/admin/reset-auction')
async def admin_reset_auction(request: Request, db: Session = Depends(get_db)):
    """Reset auction-related state for a given auction_id or all auctions.

    Body JSON:
      {"secret": "<RESET_SECRET>", "auction_id": <int|null>, "reset_wallets_to": <int|null>}

    This will:
      - set players.is_available = TRUE
      - delete rows from user_teams, team_composition, transactions, player_quits, bids, auction_participants
      - optionally delete auctions rows if auction_id provided and destructive reset requested
      - optionally reset all user.wallet_balance to provided value

    WARNING: destructive. Use only for testing/dev.
    """
    data = await request.json()
    secret = data.get('secret')
    auction_id = data.get('auction_id')
    reset_wallets_to = data.get('reset_wallets_to')

    # Allow either an admin session OR a matching RESET_SECRET in the request body.
    # This makes it possible to call this destructive endpoint from external tools using the secret
    # while still enforcing session-based admin checks by default.
    from os import getenv
    RESET_SECRET = getenv('RESET_SECRET')

    # If a RESET_SECRET is configured and provided in the body, validate it and allow stateless reset
    if RESET_SECRET and secret is not None:
        if secret != RESET_SECRET:
            raise HTTPException(status_code=403, detail="Invalid reset secret")
        # Secret matched: allow the reset without requiring a session. Record user as None for audit.
        user = None
    else:
        # Otherwise require an authenticated admin session
        user_id = request.session.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail='Not authenticated')
        user = crud.get_user_by_id(db, user_id)
        if not user or user.role != 'admin':
            raise HTTPException(status_code=403, detail='Admin privileges required')
    # because we already validated admin role above.

    try:
        # Use a transaction to perform destructive changes atomically
        if db.in_transaction():
            trans = db.begin_nested()
        else:
            trans = db.begin()

        with trans:
            # If auction_id provided, target only that auction; otherwise reset all auctions
            if auction_id:
                # Make players from that auction available
                db.query(Player).filter(Player.is_available == False).update({Player.is_available: True})

                # Delete auction-scoped rows
                db.query(UserTeam).filter(UserTeam.auction_id == auction_id).delete()
                db.query(TeamComposition).filter(TeamComposition.auction_id == auction_id).delete()
                db.query(Transaction).filter(Transaction.auction_id == auction_id).delete()
                db.query(PlayerQuit).filter(PlayerQuit.auction_id == auction_id).delete()
                db.query(Bid).filter(Bid.auction_id == auction_id).delete()
                db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == auction_id).delete()
                # Optionally delete auction row
                db.query(Auction).filter(Auction.id == auction_id).delete()
            else:
                # Global reset: make all players available and delete auction-related tables
                db.query(Player).update({Player.is_available: True})
                db.query(UserTeam).delete()
                db.query(TeamComposition).delete()
                db.query(Transaction).delete()
                db.query(PlayerQuit).delete()
                db.query(Bid).delete()
                db.query(AuctionParticipant).delete()
                # Keep auctions table unless explicitly removed

            # Reset wallets: if caller provided a value, use it; otherwise reset to system default
            # Default wallet is defined in models.User as 6500 (₹6500 Cr unit in this project)
            DEFAULT_WALLET = 6500
            reset_value = reset_wallets_to if reset_wallets_to is not None else DEFAULT_WALLET

            if auction_id:
                # Reset wallets for users who participated in this auction (if any)
                participant_user_ids = [p.user_id for p in db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == auction_id).all()]
                if participant_user_ids:
                    db.query(User).filter(User.id.in_(participant_user_ids)).update({User.wallet_balance: reset_value}, synchronize_session=False)
            else:
                # Global reset: reset all users' wallets
                db.query(User).update({User.wallet_balance: reset_value})

        # Ensure commit of outer transaction
        try:
            db.commit()
        except Exception:
            pass

        # Audit log: append a JSON line to a file for traceability (safe fallback to avoid DB schema changes)
        try:
            import json, os
            audit_entry = {
                'admin_user_id': user.id if user else None,
                'admin_username': user.username if user else None,
                'auction_id': auction_id,
                'reset_wallets_to': reset_wallets_to,
                'timestamp': datetime.datetime.utcnow().isoformat() + 'Z'
            }
            audit_path = os.path.join(os.path.dirname(__file__), 'reset_audit.log')
            with open(audit_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(audit_entry) + '\n')
        except Exception as e:
            # Do not fail the reset if audit logging fails; just print the error for debugging
            print(f"Warning: failed to write reset audit log: {e}")

        return {"success": True, "message": "Reset completed"}
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        print(f"admin_reset_auction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

# Live Auction Bidding System
class PlaceBidRequest(BaseModel):
    user_id: int
    bid_amount: float

class QuitBiddingRequest(BaseModel):
    user_id: int

@router.get('/auctions/{auction_id}/current-player')
def get_current_player_for_bidding(auction_id: int, user_id: int = None, db: Session = Depends(get_db)):
    """Get the current player being auctioned with bidding details"""
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status not in ['live', 'paused']:
        raise HTTPException(status_code=400, detail="Auction is not active")
    
    # Check if user is a participant (optional parameter for verification)
    user_is_participant = False
    user_is_admin = False
    if user_id:
        user = crud.get_user_by_id(db, user_id)
        if user and user.role == 'admin':
            user_is_admin = True
        else:
            participants = crud.get_auction_participants(db, auction_id)
            user_is_participant = any(p.user_id == user_id for p in participants)
    
    if not auction.current_player_id:
        raise HTTPException(status_code=400, detail="No player currently being auctioned")
    
    # Get player details
    player = crud.find_player_by_id(db, auction.current_player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Current player not found")
    
    # Get current highest bid for this player
    highest_bid = db.query(Bid).filter(
        Bid.auction_id == auction_id,
        Bid.player_id == auction.current_player_id
    ).order_by(Bid.bid_amount.desc(), Bid.created_at.asc()).first()
    
    # Get all bids for this player (for bid history)
    all_bids = db.query(Bid).join(User).filter(
        Bid.auction_id == auction_id,
        Bid.player_id == auction.current_player_id
    ).order_by(Bid.created_at.desc()).all()
    
    bid_history = []
    for bid in all_bids:
        user = crud.get_user_by_id(db, bid.user_id)
        bid_history.append({
            'id': bid.id,
            'user_id': bid.user_id,
            'username': user.username if user else 'Unknown',
            'team_name': user.team_name if user else 'Unknown',
            'bid_amount': bid.bid_amount,
            'created_at': bid.created_at.isoformat()
        })
    
    # Get all participants who haven't quit for this player
    participants = db.query(AuctionParticipant).filter(
        AuctionParticipant.auction_id == auction_id
    ).all()
    
    quit_participants = db.query(PlayerQuit).filter(
        PlayerQuit.auction_id == auction_id,
        PlayerQuit.player_id == auction.current_player_id
    ).all()
    quit_user_ids = [q.user_id for q in quit_participants]
    
    active_participants = [p for p in participants if p.user_id not in quit_user_ids]
    
    # Get admin info (admins can view but not bid)
    admin_users = db.query(User).filter(User.role == 'admin').all()
    admin_ids = [admin.id for admin in admin_users]
    
    current_price = highest_bid.bid_amount if highest_bid else player.base_price
    next_bid_amount = current_price + 0.5  # 50 lakhs increase
    
    # Also include any recent finalization payload so clients that poll can show
    # the sold/unsold stamp immediately after a server-side finalize occurs.
    recent_finalization = None
    try:
        # Use non-destructive getter so all clients polling in the short window
        # can observe the sold/unsold stamp showing who won the player.
        from finalize_cache import get_finalization
        recent_finalization = get_finalization(auction_id)
    except Exception:
        recent_finalization = None

    return {
        'auction_id': auction_id,
        'auction_status': auction.status,  # Include auction status for frontend
        'player': {
            'id': player.id,
            'name': player.player_name,
            'role': player.role,
            'nationality': player.nationality,
            'base_price': player.base_price
        },
        'current_price': current_price,
        'next_bid_amount': next_bid_amount,
        'highest_bidder': {
            'user_id': highest_bid.user_id if highest_bid else None,
            'username': crud.get_user_by_id(db, highest_bid.user_id).username if highest_bid else None,
            'team_name': crud.get_user_by_id(db, highest_bid.user_id).team_name if highest_bid else None
        } if highest_bid else None,
        'bid_history': bid_history,
        'recent_finalization': recent_finalization,
        'active_participants_count': len(active_participants),
        'quit_participants': quit_user_ids,
        'admin_can_view': True,  # Admins can always view
        'user_is_participant': user_is_participant,
        'user_is_admin': user_is_admin,
        'round': auction.current_round
    }


# Dev-only: inspect session contents (helpful to debug why 401 occurs). Remove or protect in production.
@router.get('/debug/session')
def debug_session(request: Request):
    try:
        return { 'session': dict(request.session) }
    except Exception as e:
        return { 'error': str(e) }


@router.get('/auctions/{auction_id}/finalized/{player_id}')
def get_finalized_player_info(auction_id: int, player_id: int, db: Session = Depends(get_db)):
    """Return whether the given player in this auction was sold and provide winner info if sold.

    Response:
      { sold: bool, winner: { user_id, username, team_name, winning_bid } | None }
    """
    # Ensure auction exists
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail='Auction not found')

    player = crud.find_player_by_id(db, player_id)
    if not player:
        raise HTTPException(status_code=404, detail='Player not found')

    # Check if any UserTeam entry exists for this auction/player
    user_team = db.query(UserTeam).filter(
        UserTeam.auction_id == auction_id,
        UserTeam.player_id == player_id
    ).first()

    if user_team:
        user = crud.get_user_by_id(db, user_team.user_id)
        winner = {
            'user_id': user_team.user_id,
            'username': user.username if user else None,
            'team_name': user.team_name if user else None,
            'winning_bid': user_team.purchase_price
        }
        return {'sold': True, 'winner': winner}
    else:
        # Unsold
        return {'sold': False, 'winner': None}

@router.post('/auctions/{auction_id}/place-bid')
def place_bid(auction_id: int, request: PlaceBidRequest, db: Session = Depends(get_db)):
    """Place a bid on the current player"""
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'live':
        if auction.status == 'paused':
            raise HTTPException(status_code=400, detail="Auction is paused. Wait for admin to resume.")
        else:
            raise HTTPException(status_code=400, detail="Auction is not active")
    
    if not auction.current_player_id:
        raise HTTPException(status_code=400, detail="No player currently being auctioned")
    
    # Get user details
    user = crud.get_user_by_id(db, request.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user has quit bidding for this player
    user_quit = db.query(PlayerQuit).filter(
        PlayerQuit.auction_id == auction_id,
        PlayerQuit.player_id == auction.current_player_id,
        PlayerQuit.user_id == request.user_id
    ).first()
    if user_quit:
        raise HTTPException(status_code=400, detail="You have quit bidding for this player")

    # Check if user is admin (admins can't bid)
    if user.role == 'admin':
        raise HTTPException(status_code=400, detail="Admins cannot place bids")

    # Check if user is a participant
    participant = db.query(AuctionParticipant).filter(
        AuctionParticipant.auction_id == auction_id,
        AuctionParticipant.user_id == request.user_id
    ).first()
    if not participant:
        raise HTTPException(status_code=400, detail="User is not a participant in this auction")
    
    # Check wallet balance
    # Wallet balance and bid_amount are in crores. Compare directly.
    if user.wallet_balance < request.bid_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    
    # Get current highest bid
    highest_bid = db.query(Bid).filter(
        Bid.auction_id == auction_id,
        Bid.player_id == auction.current_player_id
    ).order_by(Bid.bid_amount.desc()).first()
    
    player = crud.find_player_by_id(db, auction.current_player_id)
    current_price = highest_bid.bid_amount if highest_bid else player.base_price
    
    # Validate bid amount (must be exactly 50 lakhs more than current price)
    expected_bid = current_price + 0.5
    if abs(request.bid_amount - expected_bid) > 0.01:  # Allow small floating point differences
        raise HTTPException(status_code=400, detail=f"Bid must be exactly ₹{expected_bid:.1f} cr")
    
    # Check team composition limits before allowing bid
    team_composition = db.query(TeamComposition).filter(
        TeamComposition.user_id == request.user_id,
        TeamComposition.auction_id == auction_id
    ).first()
    
    if team_composition and team_composition.total_players >= 15:
        raise HTTPException(status_code=400, detail="Team is full (maximum 15 players)")
    
    # Role-based validation
    if team_composition:
        player_role = player.role.lower()
        if 'batsman' in player_role and team_composition.batsmen_count >= 5:
            raise HTTPException(status_code=400, detail="Maximum batsmen limit reached (5)")
        elif 'bowler' in player_role and team_composition.bowlers_count >= 6:
            raise HTTPException(status_code=400, detail="Maximum bowlers limit reached (6)")
        elif 'wicket' in player_role and team_composition.wicket_keepers_count >= 2:
            raise HTTPException(status_code=400, detail="Maximum wicket keepers limit reached (2)")
        elif 'all' in player_role and 'rounder' in player_role and team_composition.all_rounders_count >= 2:
            raise HTTPException(status_code=400, detail="Maximum all rounders limit reached (2)")
    
    # Create the bid
    bid = Bid(
        auction_id=auction_id,
        player_id=auction.current_player_id,
        user_id=request.user_id,
        bid_amount=request.bid_amount,
        round_number=auction.current_round
    )
    db.add(bid)
    # Remove countdown reset since we're removing timer dependency
    auction.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(bid)
    
    return {
        'message': 'Bid placed successfully',
        'bid_id': bid.id,
        'bid_amount': bid.bid_amount,
        'next_bid_amount': bid.bid_amount + 0.5
    }

@router.post('/auctions/{auction_id}/quit-bidding')
def quit_player_bidding(auction_id: int, request: QuitBiddingRequest, db: Session = Depends(get_db)):
    """Quit bidding for the current player - permanent for this player"""
    try:
        print(f"quit_player_bidding called: auction_id={auction_id}, user_id={request.user_id}")
        auction = crud.get_auction_by_id(db, auction_id)
        if not auction:
            raise HTTPException(status_code=404, detail="Auction not found")
        
        if auction.status != 'live':
            if auction.status == 'paused':
                raise HTTPException(status_code=400, detail="Auction is paused. Wait for admin to resume.")
            else:
                raise HTTPException(status_code=400, detail="Auction is not active")
        
        if not auction.current_player_id:
            raise HTTPException(status_code=400, detail="No player currently being auctioned")
        
        # Check if user already quit for this player
        existing_quit = db.query(PlayerQuit).filter(
            PlayerQuit.auction_id == auction_id,
            PlayerQuit.player_id == auction.current_player_id,
            PlayerQuit.user_id == request.user_id
        ).first()
        
        if existing_quit:
            raise HTTPException(status_code=400, detail="You have already quit bidding for this player")
        
        # Record the quit in a simple transaction to ensure consistency
        try:
            player_quit = PlayerQuit(
                auction_id=auction_id,
                player_id=auction.current_player_id,
                user_id=request.user_id
            )
            db.add(player_quit)
            db.flush()
            # Commit so the quit is persisted before finalization logic runs
            db.commit()
        except Exception as e:
            # Roll back any partial changes on error
            try:
                db.rollback()
            except Exception:
                pass
            raise HTTPException(status_code=500, detail=f"Failed to record quit: {str(e)}")
        
        # Check if all participants have quit or if only one bidder remains
        participants = db.query(AuctionParticipant).filter(
            AuctionParticipant.auction_id == auction_id
        ).all()
        
        quit_participants = db.query(PlayerQuit).filter(
            PlayerQuit.auction_id == auction_id,
            PlayerQuit.player_id == auction.current_player_id
        ).all()
        
        quit_user_ids = [q.user_id for q in quit_participants]
        active_participants = [p for p in participants if p.user_id not in quit_user_ids]
        
        # Filter out admins from active participants
        admin_user_ids = [u.id for u in db.query(User).filter(User.role == 'admin').all()]
        active_bidders = [p for p in active_participants if p.user_id not in admin_user_ids]
        # Determine if there is any explicit bid on this player. Re-query AFTER recording
        # the quit to capture a late bid that might have been placed concurrently.
        highest_bid = db.query(Bid).filter(
            Bid.auction_id == auction_id,
            Bid.player_id == auction.current_player_id
        ).order_by(Bid.bid_amount.desc(), Bid.created_at.asc()).first()

        # Finalize rules:
        # - If there is at least one bid, finalize when only one (or zero) active bidder remains (<=1)
        # - If there are no bids, finalize only when ALL active participants have quit (active_bidders == 0)
        if highest_bid:
            should_finalize = len(active_bidders) <= 1
        else:
            should_finalize = len(active_bidders) == 0
        result = {
            'message': 'Quit bidding for current player',
            'remaining_bidders': len(active_bidders),
            'should_finalize': should_finalize,
            'active_bidders': [b.user_id for b in active_bidders],
            'highest_bid_exists': True if highest_bid else False
        }

        # If we should finalize, call finalize_current_player. Note: finalize_current_player
        # will re-query bids and perform commit; to avoid nested transactional surprises we
        # call it and return its result payload directly so the frontend can render the
        # stamp for the correct finalized player before any polling swaps the current player.
        if should_finalize:
            try:
                print("Finalizing current player from quit path...")
                finalize_result = finalize_current_player(auction_id, db)
                # Ensure the finalize_result includes the finalized_player_id so the frontend
                # can show the correct player even if auction.current_player_id has moved.
                result['finalize_result'] = finalize_result
                if finalize_result.get('winner'):
                    result['winner'] = {
                        'user_id': finalize_result['winner']['user_id'],
                        'username': finalize_result['winner']['username'],
                        'team_name': finalize_result['winner']['team_name']
                    }
                # Defensive publish: ensure finalization payload is present in the
                # finalize cache so other pollers (and late clients) can observe the
                # sold/unsold stamp. `finalize_current_player` typically calls
                # `set_finalization`, but in case of any code path where it didn't
                # (or was executed in another process), publish here as a fallback.
                try:
                    winner = finalize_result.get('winner') if isinstance(finalize_result, dict) else None
                    if winner:
                        payload = {'winner': winner, 'type': 'sold'}
                    else:
                        payload = {'winner': None, 'type': 'unsold'}
                    set_finalization(auction_id, payload)
                except Exception:
                    # best-effort only; don't block the response if publish fails
                    pass
            except Exception as e:
                result['finalize_error'] = str(e)
                print(f"Error during player finalization: {str(e)}")

        return result
    except Exception as e:
        # Log any unexpected errors
        print(f"Unexpected error in quit_player_bidding: {str(e)}")
        raise

@router.post('/auctions/{auction_id}/finalize-player')
def finalize_current_player(auction_id: int, db: Session = Depends(get_db)):
    """Finalize current player when only one bidder remains or admin manually finalizes"""
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    if auction.status != 'live':
        raise HTTPException(status_code=400, detail="Auction is not live")
    
    if not auction.current_player_id:
        raise HTTPException(status_code=400, detail="No player currently being auctioned")
    
    print(f"finalize_current_player called for auction_id={auction_id}")
    # Re-fetch auction record to ensure we have the latest current_player_id
    db.refresh(auction)

    # Capture the player id that we are finalizing at the start of this operation. This
    # prevents races where current_player_id might be updated mid-finalize by another
    # code path.
    finalized_player_id = auction.current_player_id

    # Get highest bid for the player being finalized
    highest_bid = db.query(Bid).filter(
        Bid.auction_id == auction_id,
        Bid.player_id == finalized_player_id
    ).order_by(Bid.bid_amount.desc(), Bid.created_at.asc()).first()
    print(f"highest_bid: {highest_bid}")

    player = crud.find_player_by_id(db, finalized_player_id)
    
    # Initialize transaction and user variables to handle both scenarios
    tx = None
    user = None
    
    # Get the highest bidder info if there is one
    if highest_bid:
        # We'll perform all finalization steps in a DB transaction to ensure atomicity
        try:
            # Choose a proper transaction context: use a nested (SAVEPOINT) if a transaction
            # is already active on the Session, otherwise use a regular transaction.
            if db.in_transaction():
                trans = db.begin_nested()
            else:
                trans = db.begin()

            with trans:
                # Get the user data for the highest bidder
                user = crud.get_user_by_id(db, highest_bid.user_id)
                if not user:
                    raise HTTPException(status_code=404, detail="Highest bidder user not found")

                # Ensure the user's team can accept this player role; if not, mark player unsold
                if not can_user_add_player(db, user.id, auction_id, player.role):
                    # Player cannot be accepted due to composition limits. Decide whether to requeue.
                    # Count players per user for this auction
                    user_player_counts = db.query(UserTeam.user_id, func.count(UserTeam.player_id).label('count')).filter(UserTeam.auction_id == auction_id).group_by(UserTeam.user_id).all()
                    # If any user has fewer than 15 players, we should requeue the unsold player for later
                    requeue = any((up.count or 0) < 15 for up in user_player_counts)

                    if requeue:
                        # Requeue: keep player available and move to next available player that's not this player
                        player.is_available = True
                        db.flush()
                        # Clear quit records for this player
                        db.query(PlayerQuit).filter(
                            PlayerQuit.auction_id == auction_id,
                            PlayerQuit.player_id == auction.current_player_id
                        ).delete()
                        db.flush()
                        # Choose next player different from current to allow rotation
                        next_player = db.query(Player).filter(Player.is_available == True, Player.id != player.id).first()
                        if next_player:
                            auction.current_player_id = next_player.id
                            auction.current_round += 1
                            auction.countdown = 15
                        else:
                            # No other player to show, keep this player as current
                            auction.current_player_id = player.id
                        auction.updated_at = datetime.datetime.utcnow()
                        try:
                            db.commit()
                        except Exception:
                            pass
                        return {
                            'message': 'Player requeued due to team vacancies',
                            'winner': None,
                            'next_player': {
                                'id': auction.current_player_id,
                                'name': crud.find_player_by_id(db, auction.current_player_id).player_name,
                                'role': crud.find_player_by_id(db, auction.current_player_id).role,
                                'base_price': crud.find_player_by_id(db, auction.current_player_id).base_price
                            } if auction.current_player_id else None,
                            'auction_status': auction.status,
                            'round': auction.current_round,
                            'is_auction_ended': auction.status == 'ended'
                        }
                    else:
                        # No vacancies: mark player as unavailable and move to next player
                        player.is_available = False
                        db.query(PlayerQuit).filter(
                            PlayerQuit.auction_id == auction_id,
                            PlayerQuit.player_id == auction.current_player_id
                        ).delete()
                        db.flush()
                        next_player = db.query(Player).filter(Player.is_available == True).first()
                        if next_player:
                            auction.current_player_id = next_player.id
                            auction.current_round += 1
                            auction.countdown = 15
                        else:
                            auction.status = 'ended'
                            auction.ended_at = datetime.datetime.utcnow()
                            auction.current_player_id = None
                        auction.updated_at = datetime.datetime.utcnow()
                        try:
                            db.commit()
                        except Exception:
                            pass
                        return {
                            'message': 'Player went unsold due to team composition limits',
                            'winner': None,
                            'next_player': {
                                'id': next_player.id,
                                'name': next_player.player_name,
                                'role': next_player.role,
                                'base_price': next_player.base_price
                            } if next_player else None,
                            'auction_status': auction.status,
                            'round': auction.current_round,
                            'is_auction_ended': auction.status == 'ended'
                        }

                # Prevent duplicate UserTeam entries
                existing_team = db.query(UserTeam).filter_by(
                user_id=highest_bid.user_id,
                auction_id=auction_id,
                player_id=finalized_player_id
            ).first()
            
            if not existing_team:
                user_team = UserTeam(
                    user_id=highest_bid.user_id,
                    auction_id=auction_id,
                    player_id=finalized_player_id,
                    purchase_price=highest_bid.bid_amount,
                    acquired_round=auction.current_round
                )
                db.add(user_team)
                db.flush()  # Flush to ensure it's added before updating team composition

            # Do NOT modify user's stored total wallet_balance here.
            # Transactions record the debit; the active auction budget is derived from transactions on the frontend.
            deduction = highest_bid.bid_amount
            db.flush()

            # Create transaction record (negative amount = debit) inline to avoid nested commits
            tx = Transaction(user_id=highest_bid.user_id, auction_id=auction_id, player_id=auction.current_player_id, amount=-deduction, type='debit')
            db.add(tx)
            db.flush()  # ensure tx.id is available

            # Update or create team composition - this is critical for team page display
            # Try to get existing team composition first
            team_composition = db.query(TeamComposition).filter(
                TeamComposition.user_id == highest_bid.user_id,
                TeamComposition.auction_id == auction_id
            ).with_for_update().first()  # Add locking to prevent race conditions
            
            if not team_composition:
                # Create new team composition if it doesn't exist
                team_composition = TeamComposition(
                    user_id=highest_bid.user_id,
                    auction_id=auction_id,
                    batsmen_count=0,
                    bowlers_count=0,
                    wicket_keepers_count=0,
                    all_rounders_count=0,
                    total_players=0,
                    created_at=datetime.datetime.utcnow(),
                    updated_at=datetime.datetime.utcnow()
                )
                db.add(team_composition)
                db.flush()  # Flush to get the ID
            else:
                # Ensure counters not None for existing composition
                team_composition.batsmen_count = team_composition.batsmen_count or 0
                team_composition.bowlers_count = team_composition.bowlers_count or 0
                team_composition.wicket_keepers_count = team_composition.wicket_keepers_count or 0
                team_composition.all_rounders_count = team_composition.all_rounders_count or 0
                team_composition.total_players = team_composition.total_players or 0

            # Update role counts based on player role
            player_role = player.role.lower()
            if 'batsman' in player_role or 'batter' in player_role:
                team_composition.batsmen_count += 1
            elif 'bowler' in player_role:
                team_composition.bowlers_count += 1
            elif 'wicket' in player_role or 'keeper' in player_role:
                team_composition.wicket_keepers_count += 1
            elif ('all' in player_role and 'rounder' in player_role) or 'all-rounder' in player_role:
                team_composition.all_rounders_count += 1
            else:
                # Default to batsman if role doesn't match any category
                print(f"Unknown player role: {player.role}, defaulting to batsman")
                team_composition.batsmen_count += 1

            team_composition.total_players += 1
            team_composition.updated_at = datetime.datetime.utcnow()
            db.flush()

            # Mark player as unavailable
            player.is_available = False
            db.flush()
            
            # Clear quit records for this player
            db.query(PlayerQuit).filter(
                PlayerQuit.auction_id == auction_id,
                PlayerQuit.player_id == auction.current_player_id
            ).delete()
            db.flush()
            
            # Get next available player (after commit we'll expose this to the caller)
            next_player = db.query(Player).filter(Player.is_available == True).first()
            
            if next_player:
                # Move to next player
                auction.current_player_id = next_player.id
                auction.current_round += 1
                auction.countdown = 15  # Reset countdown for new player
            else:
                # No more players, end auction
                auction.status = 'ended'
                auction.ended_at = datetime.datetime.utcnow()
                auction.current_player_id = None
            
            auction.updated_at = datetime.datetime.utcnow()

            # Commit happens on exiting the 'with trans' context
            print(f"Finalized player {player.id} to highest bidder {highest_bid.user_id}")
            # Ensure session-level commit so nested transactions are persisted
            try:
                db.commit()
            except Exception:
                # If there's nothing to commit or commit fails here, ignore and continue
                pass

            # Debug counts to help verify persistence
            try:
                ut_count = db.query(UserTeam).filter(UserTeam.auction_id == auction_id, UserTeam.player_id == player.id).count()
                tx_count = db.query(Transaction).filter(Transaction.auction_id == auction_id, Transaction.player_id == player.id).count()
                tc_count = db.query(TeamComposition).filter(TeamComposition.auction_id == auction_id, TeamComposition.user_id == highest_bid.user_id).count()
                print(f"DEBUG post-commit counts: user_teams={ut_count}, transactions={tx_count}, team_composition={tc_count}")
            except Exception:
                pass
        except Exception as e:
            # If an exception occurs, ensure the session is rolled back
            try:
                db.rollback()
            except Exception:
                pass
            print(f"Failed to finalize player: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to finalize player: {str(e)}")
        
            # Refresh objects after commit
            db.refresh(user)
            db.refresh(player)
            db.refresh(auction)

            # Prepare winner info for response (include finalized_player_id so callers
            # can display stamp for the correct player even if auction.current_player_id moved)
            winner_info = {
                'user_id': highest_bid.user_id,
                'username': user.username if user else "Unknown",
                'team_name': user.team_name if user else "Unknown Team",
                'winning_bid': highest_bid.bid_amount,
                'player_name': player.player_name,
                'player_role': player.role,
                'transaction': {
                    'id': tx.id if tx else None,
                    'amount': tx.amount if tx else None,
                    'type': tx.type if tx else None,
                    'new_wallet_balance': user.wallet_balance if user else None
                },
                'finalized_player_id': finalized_player_id
            }
            # Publish finalize payload so polling clients can render the stamp
            try:
                set_finalization(auction_id, {'winner': winner_info, 'type': 'sold'})
            except Exception:
                pass
    else:
        # No explicit bids: treat player as unsold (do NOT award to sole remaining bidder if there were no bids)
        try:
            # Mark the player as unavailable to prevent repeated offers
            player.is_available = False
            db.flush()

            # Clear quit records for this player
            db.query(PlayerQuit).filter(
                PlayerQuit.auction_id == auction.id,
                PlayerQuit.player_id == auction.current_player_id
            ).delete()
            db.flush()

            # Determine whether to requeue unsold player depending on team vacancies
            user_player_counts = db.query(UserTeam.user_id, func.count(UserTeam.player_id).label('count')).filter(UserTeam.auction_id == auction_id).group_by(UserTeam.user_id).all()
            requeue = any((up.count or 0) < 15 for up in user_player_counts)

            if requeue:
                # Keep player available and rotate to next available player != current
                player.is_available = True
                db.flush()
                db.query(PlayerQuit).filter(
                    PlayerQuit.auction_id == auction.id,
                    PlayerQuit.player_id == auction.current_player_id
                ).delete()
                db.flush()
                next_player = db.query(Player).filter(Player.is_available == True, Player.id != player.id).first()
                if next_player:
                    auction.current_player_id = next_player.id
                    auction.current_round += 1
                    auction.countdown = 15
                else:
                    # No other player; keep this player as current to allow re-bidding later
                    auction.current_player_id = player.id
                auction.updated_at = datetime.datetime.utcnow()
                try:
                    db.commit()
                except Exception:
                    pass

                winner_info = None
                print(f"Player {player.player_name} (ID: {player.id}) requeued (no bids) due to vacancies")
                # Publish unsold finalization so clients polling can show stamp briefly
                try:
                    set_finalization(auction_id, {'winner': None, 'type': 'unsold', 'player_name': player.player_name if player else None})
                except Exception:
                    pass
            else:
                # No vacancies: mark as unavailable and move to next player
                player.is_available = False
                db.commit()
                winner_info = None
                print(f"Player {player.player_name} (ID: {player.id}) went unsold (no bids)")
                # Publish unsold finalization so clients polling can show stamp briefly
                try:
                    set_finalization(auction_id, {'winner': None, 'type': 'unsold', 'player_name': player.player_name if player else None})
                except Exception:
                    pass
                next_player = db.query(Player).filter(Player.is_available == True).first()
                if next_player:
                    auction.current_player_id = next_player.id
                    auction.current_round += 1
                    auction.countdown = 15
                else:
                    auction.status = 'ended'
                    auction.ended_at = datetime.datetime.utcnow()
                    auction.current_player_id = None
                auction.updated_at = datetime.datetime.utcnow()

        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            print(f"Error marking player as unavailable: {str(e)}")
            next_player = None
    
    return {
        'message': 'Player finalized successfully',
        'winner': winner_info,
        'next_player': {
            'id': next_player.id,
            'name': next_player.player_name,
            'role': next_player.role,
            'base_price': next_player.base_price
        } if next_player else None,
        'auction_status': auction.status,
        'round': auction.current_round,
        'is_auction_ended': auction.status == 'ended'
    }


@router.post('/auctions/{auction_id}/buy-player')
def buy_player_immediate(auction_id: int, user_id: int, db: Session = Depends(get_db)):
    """Allow a last-standing participant to immediately buy the current player at the current price.

    Request params:
      - user_id: id of the purchasing participant (simple form param for now)

    Behavior:
      - Validate auction live and that user is a participant
      - Ensure user has not previously quit for this player
      - Determine the current price (highest bid or base price)
      - Validate user's wallet and composition limits
      - Perform the purchase atomically (UserTeam, Transaction, TeamComposition updates)
      - Return a finalize-style response with winner and next_player
    """
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail='Auction not found')

    if auction.status != 'live':
        raise HTTPException(status_code=400, detail='Auction is not live')

    if not auction.current_player_id:
        raise HTTPException(status_code=400, detail='No player currently being auctioned')

    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    # Ensure user is a participant
    participant = db.query(AuctionParticipant).filter(AuctionParticipant.auction_id == auction_id, AuctionParticipant.user_id == user_id).first()
    if not participant:
        raise HTTPException(status_code=400, detail='User is not a participant in this auction')

    # Check whether user quit for this player
    user_quit = db.query(PlayerQuit).filter(PlayerQuit.auction_id == auction_id, PlayerQuit.player_id == auction.current_player_id, PlayerQuit.user_id == user_id).first()
    if user_quit:
        raise HTTPException(status_code=400, detail='You have quit bidding for this player')

    # Determine current price (highest bid if exists, else base price)
    highest_bid = db.query(Bid).filter(Bid.auction_id == auction_id, Bid.player_id == auction.current_player_id).order_by(Bid.bid_amount.desc(), Bid.created_at.asc()).first()
    player = crud.find_player_by_id(db, auction.current_player_id)
    current_price = highest_bid.bid_amount if highest_bid else player.base_price

    # Wallets and prices are expressed in crores. Ensure sufficient funds.
    deduction = current_price
    if user.wallet_balance < deduction:
        raise HTTPException(status_code=400, detail='Insufficient wallet balance')

    # Check composition limits
    if not can_user_add_player(db, user_id, auction_id, player.role):
        raise HTTPException(status_code=400, detail='User team composition prevents adding this player')

    # Perform atomic purchase
    try:
        if db.in_transaction():
            trans = db.begin_nested()
        else:
            trans = db.begin()

        with trans:
            # Prevent duplicate award
            existing_team = db.query(UserTeam).filter_by(user_id=user_id, auction_id=auction_id, player_id=auction.current_player_id).first()
            if existing_team:
                raise HTTPException(status_code=400, detail='Player already acquired by this user')

            user_team = UserTeam(user_id=user_id, auction_id=auction_id, player_id=auction.current_player_id, purchase_price=current_price, acquired_round=auction.current_round)
            db.add(user_team)
            db.flush()

            # Do NOT modify stored wallet_balance here; create a transaction record for the debit.
            tx = Transaction(user_id=user_id, auction_id=auction_id, player_id=auction.current_player_id, amount=-deduction, type='debit')
            db.add(tx)
            db.flush()

            # Update or create team composition
            team_composition = db.query(TeamComposition).filter(TeamComposition.user_id == user_id, TeamComposition.auction_id == auction_id).with_for_update().first()
            if not team_composition:
                team_composition = TeamComposition(user_id=user_id, auction_id=auction_id, batsmen_count=0, bowlers_count=0, wicket_keepers_count=0, all_rounders_count=0, total_players=0, created_at=datetime.datetime.utcnow(), updated_at=datetime.datetime.utcnow())
                db.add(team_composition)
                db.flush()

            pr_role = player.role.lower()
            if 'batsman' in pr_role or 'batter' in pr_role:
                team_composition.batsmen_count = (team_composition.batsmen_count or 0) + 1
            elif 'bowler' in pr_role:
                team_composition.bowlers_count = (team_composition.bowlers_count or 0) + 1
            elif 'wicket' in pr_role or 'keeper' in pr_role:
                team_composition.wicket_keepers_count = (team_composition.wicket_keepers_count or 0) + 1
            elif ('all' in pr_role and 'rounder' in pr_role) or 'all-rounder' in pr_role:
                team_composition.all_rounders_count = (team_composition.all_rounders_count or 0) + 1
            else:
                team_composition.batsmen_count = (team_composition.batsmen_count or 0) + 1

            team_composition.total_players = (team_composition.total_players or 0) + 1
            team_composition.updated_at = datetime.datetime.utcnow()
            db.flush()

            # Mark player unavailable
            player.is_available = False
            db.flush()

            # Clear quit records for this player
            db.query(PlayerQuit).filter(PlayerQuit.auction_id == auction_id, PlayerQuit.player_id == auction.current_player_id).delete()
            db.flush()

            # Move to next available player or end auction
            next_player = db.query(Player).filter(Player.is_available == True).first()
            if next_player:
                auction.current_player_id = next_player.id
                auction.current_round += 1
                auction.countdown = 15
            else:
                auction.status = 'ended'
                auction.ended_at = datetime.datetime.utcnow()
                auction.current_player_id = None

            auction.updated_at = datetime.datetime.utcnow()
            try:
                db.commit()
            except Exception:
                pass

    except HTTPException:
        # re-raise validation HTTP errors
        raise
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f'Failed to perform purchase: {str(e)}')

    # Refresh objects for response
    db.refresh(user)
    db.refresh(player)
    db.refresh(auction)

    winner_info = {
        'user_id': user.id,
        'username': user.username,
        'team_name': user.team_name,
        'winning_bid': current_price,
        'player_name': player.player_name,
        'player_role': player.role,
        'transaction': {
            'id': tx.id if tx else None,
            'amount': tx.amount if tx else None,
            'type': tx.type if tx else None,
            'new_wallet_balance': user.wallet_balance if user else None
        },
        'finalized_player_id': auction.current_player_id if auction.current_player_id else None
    }

    try:
        set_finalization(auction_id, {'winner': winner_info, 'type': 'sold'})
    except Exception:
        pass

    return {
        'message': 'Player purchased successfully',
        'winner': winner_info,
        'next_player': {
            'id': next_player.id,
            'name': next_player.player_name,
            'role': next_player.role,
            'base_price': next_player.base_price
        } if next_player else None,
        'auction_status': auction.status,
        'round': auction.current_round,
        'is_auction_ended': auction.status == 'ended'
    }

@router.get('/auctions/{auction_id}/leaderboard')
def get_auction_leaderboard(auction_id: int, db: Session = Depends(get_db)):
    """Get leaderboard data ONLY from leaderboards table - NO calculation"""
    
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail='Auction not found')
    
    # Get leaderboard data directly from leaderboards table
    leaderboard_entries = db.query(Leaderboard).filter(
        Leaderboard.auction_id == auction_id
    ).order_by(Leaderboard.rank).all()
    
    if not leaderboard_entries:
        return {
            'auction_id': auction_id,
            'auction_name': auction.name,
            'leaderboard': [],
            'total_teams': 0,
            'data_source': 'leaderboards_table',
            'message': 'No saved leaderboard data found. Leaderboard will be available after auction ends and data is saved.'
        }
    
    # Get user details for each leaderboard entry
    leaderboard_data = []
    for entry in leaderboard_entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        
        leaderboard_data.append({
            'rank': entry.rank,
            'user_id': entry.user_id,
            'team_name': user.team_name if user and user.team_name else f"User {entry.user_id}",
            'username': user.username if user else f"user_{entry.user_id}",
            'players_count': entry.total_players,
            'total_spent': float(entry.total_spent),
            'remaining_balance': float(entry.remaining_balance),
            'efficiency': float(entry.efficiency_score),
            'ai_analysis': entry.ai_analysis,
            'created_at': entry.created_at.isoformat() if entry.created_at else None
        })
    
    return {
        'auction_id': auction_id,
        'auction_name': auction.name,
        'leaderboard': leaderboard_data,
        'total_teams': len(leaderboard_data),
        'data_source': 'leaderboards_table'
    }


@router.get('/leaderboard/latest')
def get_latest_leaderboard(db: Session = Depends(get_db)):
    """Get leaderboard for the most recent completed auction - prioritizes saved data from leaderboards table"""
    # Get the most recent completed auction
    latest_auction = db.query(Auction).filter(
        Auction.status == 'ended'
    ).order_by(Auction.updated_at.desc()).first()
    
    if not latest_auction:
        # If no completed auction, get the latest auction regardless of status
        latest_auction = db.query(Auction).order_by(Auction.created_at.desc()).first()
        
    if not latest_auction:
        raise HTTPException(status_code=404, detail='No auctions found')
    
    # Get leaderboard data ONLY from leaderboards table
    return get_auction_leaderboard(latest_auction.id, db)


@router.get('/debug/leaderboard/{auction_id}')
def debug_leaderboard_data(auction_id: int, db: Session = Depends(get_db)):
    """Debug endpoint to check leaderboard data in database"""
    try:
        # Check if leaderboard entries exist
        entries = db.query(Leaderboard).filter(Leaderboard.auction_id == auction_id).all()
        
        return {
            'auction_id': auction_id,
            'total_entries': len(entries),
            'entries': [
                {
                    'id': entry.id,
                    'user_id': entry.user_id,
                    'rank': entry.rank,
                    'total_players': entry.total_players,
                    'total_spent': entry.total_spent,
                    'remaining_balance': entry.remaining_balance,
                    'efficiency_score': entry.efficiency_score,
                    'created_at': entry.created_at.isoformat() if entry.created_at else None
                } for entry in entries
            ]
        }
    except Exception as e:
        return {
            'error': str(e),
            'auction_id': auction_id,
            'total_entries': 0,
            'entries': []
        }


@router.post('/debug/test-save-leaderboard/{auction_id}')
def test_save_leaderboard(auction_id: int, db: Session = Depends(get_db)):
    """Test endpoint to manually trigger efficiency-based leaderboard save"""
    success = calculate_and_save_leaderboard_internal(auction_id, db)
    
    if success:
        verify_count = db.query(Leaderboard).filter(Leaderboard.auction_id == auction_id).count()
        return {
            'test_status': 'success',
            'message': 'Efficiency-based leaderboard calculated and saved to PostgreSQL table!',
            'teams_saved': verify_count
        }
    else:
        return {
            'test_status': 'error',
            'error_message': 'Failed to calculate and save leaderboard'
        }

@router.get('/debug/calculate-ovr/{auction_id}')
def debug_calculate_ovr(auction_id: int, db: Session = Depends(get_db)):
    """Debug endpoint to see OVR calculation without saving"""
    try:
        leaderboard = calculate_ovr_leaderboard(auction_id, db)
        return {
            'auction_id': auction_id,
            'total_teams': len(leaderboard),
            'leaderboard': leaderboard,
            'calculation_method': 'OVR_based_ranking'
        }
    except Exception as e:
        return {
            'error': str(e),
            'auction_id': auction_id
        }

def calculate_and_save_leaderboard_internal(auction_id: int, db: Session):
    """Internal function to calculate and save efficiency-based leaderboard (no FastAPI dependencies)"""
    try:
        print(f"🏆 Auto-calculating efficiency-based leaderboard for auction {auction_id}")
        
        # Check auction exists
        auction = crud.get_auction_by_id(db, auction_id)
        if not auction:
            print(f"❌ Auction {auction_id} not found")
            return False
        
        # Calculate efficiency-based leaderboard
        leaderboard = calculate_ovr_leaderboard(auction_id, db)
        print(f"📊 Calculated leaderboard with {len(leaderboard)} teams")
        
        if not leaderboard:
            print("⚠️ No teams found to create leaderboard")
            return False
        
        # Clear existing leaderboard entries for this auction
        deleted_count = db.query(Leaderboard).filter(Leaderboard.auction_id == auction_id).count()
        db.query(Leaderboard).filter(Leaderboard.auction_id == auction_id).delete()
        print(f"🗑️ Deleted {deleted_count} existing leaderboard entries")
        
        # Save new leaderboard entries
        saved_count = 0
        for team_data in leaderboard:
            remaining_balance = 100.0 - team_data['total_spent']
            efficiency_score = team_data['efficiency']
            
            # Generate AI analysis based on efficiency ranking
            rank_suffix = "st" if team_data['rank'] == 1 else "nd" if team_data['rank'] == 2 else "rd" if team_data['rank'] == 3 else "th"
            ai_analysis = f"🏆 Rank {team_data['rank']}{rank_suffix}! Team '{team_data['team_name']}' achieved {efficiency_score:.2f} efficiency points per crore. "
            ai_analysis += f"Built {team_data['players_count']} player squad spending ₹{team_data['total_spent']:.2f}cr strategically. "
            
            if team_data['rank'] == 1:
                ai_analysis += "🥇 CHAMPION! Highest efficiency demonstrates superior value acquisition and team building strategy."
            elif team_data['rank'] == 2:
                ai_analysis += "🥈 EXCELLENT! Strong efficiency shows smart bidding and quality team composition."
            elif team_data['rank'] == 3:
                ai_analysis += "🥉 SOLID! Good efficiency with balanced approach to player acquisition."
            elif remaining_balance > 50:
                ai_analysis += "Conservative strategy with substantial remaining budget for future opportunities."
            else:
                ai_analysis += "Competitive performance with room for improvement in cost-effectiveness."
            
            leaderboard_entry = Leaderboard(
                auction_id=auction_id,
                user_id=team_data['user_id'],
                rank=team_data['rank'],
                total_players=team_data['players_count'],
                total_spent=team_data['total_spent'],
                remaining_balance=remaining_balance,
                efficiency_score=efficiency_score,
                ai_analysis=ai_analysis,
                created_at=datetime.datetime.utcnow()
            )
            db.add(leaderboard_entry)
            saved_count += 1
            print(f"  ✅ Rank {team_data['rank']}: {team_data['username']} - Efficiency {efficiency_score:.3f}")
        
        db.commit()
        print(f"💾 SUCCESS! Automatically saved {saved_count} efficiency-ranked leaderboard entries to PostgreSQL!")
        
        # Verify the data was saved
        verify_count = db.query(Leaderboard).filter(Leaderboard.auction_id == auction_id).count()
        print(f"🔍 Verification: {verify_count} entries now in leaderboards table")
        
        return True
        
    except Exception as e:
        print(f"❌ Error auto-saving leaderboard for auction {auction_id}: {str(e)}")
        db.rollback()
        return False

def calculate_ovr_leaderboard(auction_id: int, db: Session):
    """Calculate OVR-based leaderboard rankings for an auction"""
    from sqlalchemy import func
    
    # Get all teams with their players and calculate OVR using window function for ranking
    teams_subquery = db.query(
        UserTeam.user_id,
        User.username,
        User.team_name,
        func.count(UserTeam.player_id).label('players_count'),
        func.sum(UserTeam.purchase_price).label('total_spent'),
        func.sum(PlayerPerformance.points_earned).label('total_points'),
        (func.sum(PlayerPerformance.points_earned) / func.count(UserTeam.player_id)).label('avg_ovr_raw')
    ).join(
        User, UserTeam.user_id == User.id
    ).join(
        Player, UserTeam.player_id == Player.id
    ).outerjoin(
        PlayerPerformance, Player.id == PlayerPerformance.player_id
    ).filter(
        UserTeam.auction_id == auction_id
    ).group_by(
        UserTeam.user_id, User.username, User.team_name
    ).subquery()
    
    # Calculate efficiency in subquery for ranking
    teams_with_efficiency = db.query(
        teams_subquery.c.user_id,
        teams_subquery.c.username,
        teams_subquery.c.team_name,
        teams_subquery.c.players_count,
        teams_subquery.c.total_spent,
        teams_subquery.c.total_points,
        teams_subquery.c.avg_ovr_raw,
        (teams_subquery.c.total_points / teams_subquery.c.total_spent).label('efficiency_calc')
    ).subquery()
    
    # Apply DENSE_RANK based on efficiency (highest efficiency = rank 1)
    teams_query = db.query(
        teams_with_efficiency.c.user_id,
        teams_with_efficiency.c.username,
        teams_with_efficiency.c.team_name,
        teams_with_efficiency.c.players_count,
        teams_with_efficiency.c.total_spent,
        teams_with_efficiency.c.total_points,
        teams_with_efficiency.c.avg_ovr_raw,
        teams_with_efficiency.c.efficiency_calc,
        func.dense_rank().over(
            order_by=teams_with_efficiency.c.efficiency_calc.desc().nullslast()
        ).label('dense_rank')
    ).order_by(
        teams_with_efficiency.c.efficiency_calc.desc().nullslast()
    )
    
    teams = teams_query.all()
    
    # Calculate OVR and format leaderboard
    leaderboard = []
    for team in teams:
        # Calculate OVR based on AVERAGE points earned by team players
        total_points = team.total_points if team.total_points else 0
        
        # Get team player details for better OVR calculation
        team_players = db.query(Player, UserTeam.purchase_price).join(
            UserTeam, Player.id == UserTeam.player_id
        ).filter(
            UserTeam.user_id == team.user_id,
            UserTeam.auction_id == auction_id
        ).all()
        
        # Calculate average OVR per player
        players_count = len(team_players)
        if players_count > 0:
            if total_points == 0:
                # Calculate based on player roles and base prices
                role_weights = {'Batsman': 1.2, 'Bowler': 1.1, 'All-Rounder': 1.5, 'Wicket-Keeper': 1.3}
                total_base_ovr = 0
                for player, price in team_players:
                    role_weight = role_weights.get(player.role, 1.0)
                    total_base_ovr += (player.base_price * role_weight) / 100  # Normalize to reasonable scale
                avg_ovr = total_base_ovr / players_count
            else:
                avg_ovr = team.avg_ovr_raw if team.avg_ovr_raw else 0
        else:
            avg_ovr = 0
        
        # Use the efficiency calculated in the query (points per crore spent)
        efficiency = float(team.efficiency_calc) if team.efficiency_calc else 0.0
        
        leaderboard.append({
            'user_id': team.user_id,
            'username': team.username,
            'team_name': team.team_name or f"{team.username}'s Team",
            'players_count': team.players_count,
            'total_spent': float(team.total_spent or 0),
            'total_points': round(total_points, 2),
            'avg_ovr': round(avg_ovr, 2),
            'efficiency': round(efficiency, 3),
            'rank': team.dense_rank,  # Now ranked by efficiency using DENSE_RANK
        })
    
    return leaderboard

@router.post('/auctions/{auction_id}/leaderboard/save')
def save_auction_leaderboard(auction_id: int, db: Session = Depends(get_db)):
    """Calculate efficiency-based leaderboard and save to leaderboards table"""
    success = calculate_and_save_leaderboard_internal(auction_id, db)
    
    if success:
        # Get verification count
        verify_count = db.query(Leaderboard).filter(Leaderboard.auction_id == auction_id).count()
        return {
            'success': True,
            'message': f'Efficiency-based leaderboard saved for auction {auction_id}',
            'teams_saved': verify_count,
            'verified_count': verify_count,
            'calculation_method': 'Efficiency_based_ranking'
        }
    else:
        raise HTTPException(status_code=500, detail='Failed to save leaderboard')

@router.get('/auctions/{auction_id}/leaderboard/saved')
def get_saved_auction_leaderboard(auction_id: int, db: Session = Depends(get_db)):
    """Get saved leaderboard from leaderboards table for the auction"""
    auction = crud.get_auction_by_id(db, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail='Auction not found')
    
    # Get saved leaderboard entries
    saved_entries = db.query(Leaderboard, User.username, User.team_name).join(
        User, Leaderboard.user_id == User.id
    ).filter(
        Leaderboard.auction_id == auction_id
    ).order_by(
        Leaderboard.rank.asc()
    ).all()
    
    if not saved_entries:
        # If no saved data, return current leaderboard
        return get_auction_leaderboard(auction_id, db)
    
    # Format saved leaderboard
    leaderboard = []
    for entry, username, team_name in saved_entries:
        # Get team players for display
        team_players = db.query(Player, UserTeam.purchase_price).join(
            UserTeam, Player.id == UserTeam.player_id
        ).filter(
            UserTeam.user_id == entry.user_id,
            UserTeam.auction_id == auction_id
        ).all()
        
        # Calculate total points for this team
        total_points = 0
        for player, price in team_players:
            performance = db.query(PlayerPerformance).filter(PlayerPerformance.player_id == player.id).first()
            if performance and performance.points_earned:
                total_points += performance.points_earned

        leaderboard.append({
            'user_id': entry.user_id,
            'username': username,
            'team_name': team_name or f"{username}'s Team",
            'players_count': entry.total_players,
            'total_spent': entry.total_spent,
            'remaining_balance': entry.remaining_balance,
            'efficiency_score': entry.efficiency_score,
            'efficiency': entry.efficiency_score,  # Frontend expects 'efficiency'
            'ai_analysis': entry.ai_analysis,
            'rank': entry.rank,
            'total_points': total_points,
            'avg_ovr': total_points / entry.total_players if entry.total_players > 0 else 0,  # Calculate avg OVR
            'ovr': total_points / entry.total_players if entry.total_players > 0 else 0,      # Frontend expects both avg_ovr and ovr
            'saved_at': entry.created_at.isoformat() if entry.created_at else None,
            'players': [
                {
                    'id': player.id,
                    'name': player.player_name,
                    'role': player.role,
                    'purchase_price': price
                }
                for player, price in team_players
            ]
        })
    
    return {
        'auction_id': auction_id,
        'auction_name': auction.name,
        'auction_status': auction.status,
        'total_teams': len(leaderboard),
        'is_saved_data': True,
        'leaderboard': leaderboard
    }
 