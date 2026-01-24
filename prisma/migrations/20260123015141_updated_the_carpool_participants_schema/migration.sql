-- AddForeignKey
ALTER TABLE "CarpoolParticipant" ADD CONSTRAINT "CarpoolParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpoolMessage" ADD CONSTRAINT "CarpoolMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
