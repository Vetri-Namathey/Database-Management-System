-- Add start_time column to auctions table
-- This column stores the scheduled start time for an auction

ALTER TABLE auctions 
ADD COLUMN start_time TIMESTAMP NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN auctions.start_time IS 'Scheduled start time for the auction, set by admin when creating the auction';