#!/bin/bash

# Exit on any failure
set -e

# ANSI Color Codes for beautiful CLI output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}    Waave Platform Development Environment Setup    ${NC}"
echo -e "${BLUE}===================================================${NC}"

# 1. Update file execution permissions
echo -e "\n${YELLOW}[1/4] Applying execution permissions to initialization scripts...${NC}"
if [ -f "pg-init/primary-init.sh" ]; then
  chmod +x pg-init/primary-init.sh
  echo -e "  ${GREEN}✔${NC} pg-init/primary-init.sh is now executable."
else
  echo -e "  ${YELLOW}⚠${NC} pg-init/primary-init.sh not found."
fi

if [ -f "mongo-init/replica-init.sh" ]; then
  chmod +x mongo-init/replica-init.sh
  echo -e "  ${GREEN}✔${NC} mongo-init/replica-init.sh is now executable."
else
  echo -e "  ${YELLOW}⚠${NC} mongo-init/replica-init.sh not found."
fi

# 2. Setup /etc/hosts for MongoDB Replica Sets
echo -e "\n${YELLOW}[2/4] Checking local DNS maps in /etc/hosts...${NC}"
HOSTS_REQUIRED=(
  "notification_mongo_db_1"
  "notification_mongo_db_2"
  "notification_mongo_db_3"
  "media_mongo_db_1"
  "media_mongo_db_2"
  "media_mongo_db_3"
  "chat_mongo_db_1"
  "chat_mongo_db_2"
  "chat_mongo_db_3"
)

MISSING_HOSTS=()
for h in "${HOSTS_REQUIRED[@]}"; do
  if ! grep -q "$h" /etc/hosts; then
    MISSING_HOSTS+=("$h")
  fi
done

if [ ${#MISSING_HOSTS[@]} -eq 0 ]; then
  echo -e "  ${GREEN}✔${NC} All MongoDB replica set host routes are already configured in /etc/hosts."
else
  echo -e "  ${YELLOW}▶${NC} Mappings are missing for: ${MISSING_HOSTS[*]}"
  echo -e "  ${YELLOW}▶${NC} Appending mappings to /etc/hosts. Sudo authorization is required:"
  
  MAPS_TO_ADD="127.0.0.1 ${HOSTS_REQUIRED[*]}"
  sudo sh -c "echo '' >> /etc/hosts"
  sudo sh -c "echo '# Waave MongoDB Replica Set Local DNS Mapping' >> /etc/hosts"
  sudo sh -c "echo '$MAPS_TO_ADD' >> /etc/hosts"
  
  echo -e "  ${GREEN}✔${NC} Successfully configured replica set mappings in /etc/hosts."
fi

# 3. Install packages
echo -e "\n${YELLOW}[3/4] Installing Node dependencies...${NC}"
npm install
echo -e "  ${GREEN}✔${NC} NPM packages installed."

# 4. Generate proto schemas
echo -e "\n${YELLOW}[4/4] Generating typescript interfaces from Protos...${NC}"
npm run proto:generate
echo -e "  ${GREEN}✔${NC} Proto message contracts fully compiled."

echo -e "\n${GREEN}===================================================${NC}"
echo -e "${GREEN}✔ Setup completed successfully!${NC}"
echo -e "${GREEN}===================================================${NC}"
echo -e "Next steps to run the application:"
echo -e "  1. Run the support container stack: ${BLUE}docker compose up -d${NC}"
echo -e "  2. Perform database migrations:"
echo -e "     ${BLUE}npm run auth:prisma:migrate${NC}"
echo -e "     ${BLUE}npm run user:prisma:migrate${NC}"
echo -e "     ${BLUE}npm run post:prisma:migrate${NC}"
echo -e "  3. Launch your NestJS microservices (e.g., dev watch command)"
echo -e "${GREEN}===================================================${NC}\n"
