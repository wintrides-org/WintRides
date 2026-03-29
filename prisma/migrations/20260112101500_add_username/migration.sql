ALTER TABLE "User" ADD COLUMN "userName" TEXT NOT NULL;

CREATE UNIQUE INDEX "User_userName_key" ON "User"("userName");
