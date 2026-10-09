-- AlterEnum: Hot (12oz) at Iced (16oz) para sa drinks
ALTER TYPE "ProductSize" ADD VALUE IF NOT EXISTS 'HOT';
ALTER TYPE "ProductSize" ADD VALUE IF NOT EXISTS 'ICED';
