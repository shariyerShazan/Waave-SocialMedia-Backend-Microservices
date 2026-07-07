#!/bin/bash

set -e

echo "Waiting for MongoDB..."

sleep 10

mongosh "mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${PRIMARY_HOST}/admin?authSource=admin" <<EOF

try {
    rs.status();
    print("Replica Set already initialized.");
} catch (e) {
    rs.initiate({
        _id: "${REPLICA_SET_NAME}",
        members: [
            { _id: 0, host: "${MEMBER_1}" },
            { _id: 1, host: "${MEMBER_2}" },
            { _id: 2, host: "${MEMBER_3}" }
        ]
    });

    print("Replica Set initialized.");
}

EOF