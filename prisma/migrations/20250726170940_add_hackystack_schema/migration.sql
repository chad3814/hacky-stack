-- CreateEnum
CREATE TYPE "ApplicationRole" AS ENUM ('VIEWER', 'EDITOR', 'OWNER');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "role" "ApplicationRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "application_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variables" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_environments" (
    "id" TEXT NOT NULL,
    "secret_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,

    CONSTRAINT "secret_environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variable_environments" (
    "id" TEXT NOT NULL,
    "variable_id" TEXT NOT NULL,
    "environment_id" TEXT NOT NULL,

    CONSTRAINT "variable_environments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_users_user_id_application_id_key" ON "application_users"("user_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "environments_name_application_id_key" ON "environments"("name", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "secrets_key_application_id_key" ON "secrets"("key", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "variables_key_application_id_key" ON "variables"("key", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "secret_environments_secret_id_environment_id_key" ON "secret_environments"("secret_id", "environment_id");

-- CreateIndex
CREATE UNIQUE INDEX "variable_environments_variable_id_environment_id_key" ON "variable_environments"("variable_id", "environment_id");

-- AddForeignKey
ALTER TABLE "application_users" ADD CONSTRAINT "application_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_users" ADD CONSTRAINT "application_users_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variables" ADD CONSTRAINT "variables_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_environments" ADD CONSTRAINT "secret_environments_secret_id_fkey" FOREIGN KEY ("secret_id") REFERENCES "secrets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_environments" ADD CONSTRAINT "secret_environments_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variable_environments" ADD CONSTRAINT "variable_environments_variable_id_fkey" FOREIGN KEY ("variable_id") REFERENCES "variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variable_environments" ADD CONSTRAINT "variable_environments_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
