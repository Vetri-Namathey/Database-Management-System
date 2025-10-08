from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    team_name = Column(String)
    role = Column(String, default='user')
    wallet_balance = Column(Float, default=6500)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Add relationships if needed

class Player(Base):
    __tablename__ = 'players'
    id = Column(Integer, primary_key=True, index=True)
    player_name = Column(String)
    role = Column(String)
    nationality = Column(String)
    base_price = Column(Float)
    is_available = Column(Boolean, default=True)
    # Add relationships if needed

class PlayerPerformance(Base):
    __tablename__ = 'player_performance'
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey('players.id'))
    runs_scored = Column(Integer)
    wickets_taken = Column(Integer)
    catches = Column(Integer)
    strike_rate = Column(Float)
    economy_rate = Column(Float)
    points_earned = Column(Float)
    # Add relationships if needed

class Auction(Base):
    __tablename__ = 'auctions'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    status = Column(String, default='waiting')
    current_player_id = Column(Integer, ForeignKey('players.id'))
    current_round = Column(Integer, default=1)
    max_rounds = Column(Integer, default=5)
    countdown = Column(Integer, default=15)
    min_participants = Column(Integer, default=2)
    max_participants = Column(Integer, default=10)
    start_time = Column(DateTime, nullable=True)  # Scheduled start time
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class Bid(Base):
    __tablename__ = 'bids'
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    player_id = Column(Integer, ForeignKey('players.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    bid_amount = Column(Float)
    round_number = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserTeam(Base):
    __tablename__ = 'user_teams'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    player_id = Column(Integer, ForeignKey('players.id'))
    purchase_price = Column(Float)
    acquired_round = Column(Integer)

class TeamComposition(Base):
    __tablename__ = 'team_composition'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    batsmen_count = Column(Integer, default=0)
    bowlers_count = Column(Integer, default=0)
    wicket_keepers_count = Column(Integer, default=0)
    all_rounders_count = Column(Integer, default=0)
    total_players = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuctionParticipant(Base):
    __tablename__ = 'auction_participants'
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_waiting = Column(Boolean, default=True)

class PlayerQuit(Base):
    __tablename__ = 'player_quits'
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    player_id = Column(Integer, ForeignKey('players.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    auction_id = Column(Integer, ForeignKey('auctions.id'), nullable=True)
    player_id = Column(Integer, ForeignKey('players.id'), nullable=True)
    amount = Column(Float)  # positive for credit, negative for debit
    type = Column(String)  # e.g., 'debit', 'credit', 'refund'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Leaderboard(Base):
    __tablename__ = 'leaderboards'
    id = Column(Integer, primary_key=True, index=True)
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    rank = Column(Integer)
    total_players = Column(Integer)
    total_spent = Column(Float)  # numeric(6,2)
    remaining_balance = Column(Float)  # numeric(6,2)
    efficiency_score = Column(Float)  # numeric(5,2)
    ai_analysis = Column(String)  # text
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # timestamp without time zone
