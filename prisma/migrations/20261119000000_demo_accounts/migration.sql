-- Public demo accounts flag (additive, no data change)
ALTER TABLE "user" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
