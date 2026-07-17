#!/bin/bash

set -e

echo "Waiting for MongoDB..."

sleep 10

# Dynamically construct members array based on available MEMBER_* env vars
MEMBERS_JSON=""
idx=0
while true; do
  var_name="MEMBER_$((idx + 1))"
  var_val="${!var_name}"
  if [ -z "$var_val" ]; then
    break
  fi
  if [ $idx -ne 0 ]; then
    MEMBERS_JSON+=", "
  fi
  MEMBERS_JSON+="{\"_id\": $idx, \"host\": \"$var_val\"}"
  idx=$((idx + 1))
done

mongosh "mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${PRIMARY_HOST}/admin?authSource=admin" <<EOF

try {
    rs.status();
    print("Replica Set already initialized.");
} catch (e) {
    rs.initiate({
        _id: "${REPLICA_SET_NAME}",
        members: [
            ${MEMBERS_JSON}
        ]
    });

    print("Replica Set initialized.");
}

EOF