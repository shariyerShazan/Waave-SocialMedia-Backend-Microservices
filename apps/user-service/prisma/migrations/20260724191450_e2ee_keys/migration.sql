-- CreateTable
CREATE TABLE "user_identity_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identity_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_signed_pre_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "keyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signed_pre_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_one_time_pre_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "keyId" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_one_time_pre_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL DEFAULT 'unknown',
    "platform" TEXT NOT NULL DEFAULT 'unknown',
    "pushToken" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identity_keys_userId_key" ON "user_identity_keys"("userId");

-- CreateIndex
CREATE INDEX "user_identity_keys_userId_idx" ON "user_identity_keys"("userId");

-- CreateIndex
CREATE INDEX "user_signed_pre_keys_userId_idx" ON "user_signed_pre_keys"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_signed_pre_keys_userId_deviceId_key" ON "user_signed_pre_keys"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "user_one_time_pre_keys_userId_deviceId_consumed_idx" ON "user_one_time_pre_keys"("userId", "deviceId", "consumed");

-- CreateIndex
CREATE UNIQUE INDEX "user_one_time_pre_keys_userId_deviceId_keyId_key" ON "user_one_time_pre_keys"("userId", "deviceId", "keyId");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_deviceId_idx" ON "user_devices"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_deviceId_key" ON "user_devices"("userId", "deviceId");

-- AddForeignKey
ALTER TABLE "user_identity_keys" ADD CONSTRAINT "user_identity_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_signed_pre_keys" ADD CONSTRAINT "user_signed_pre_keys_userId_deviceId_fkey" FOREIGN KEY ("userId", "deviceId") REFERENCES "user_devices"("userId", "deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_one_time_pre_keys" ADD CONSTRAINT "user_one_time_pre_keys_userId_deviceId_fkey" FOREIGN KEY ("userId", "deviceId") REFERENCES "user_devices"("userId", "deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
