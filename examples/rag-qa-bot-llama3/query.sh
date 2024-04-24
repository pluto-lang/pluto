#!/bin/bash
# set -o xtrace

echo "NOTE: This QA bot cannot keep a conversation. It can only answer the question you just asked."
echo ""

read -p "Input the URL that Pluto has outputted: " URL
if [ -z $URL ]; then
    echo "Please set the BOT_URL env var first"
    exit 1
fi

echo -e "\nNow you can ask your question!"
user_message=""
while :; do
    echo "Press 'q' to quit."
    read -p "User > " user_message
    if [[ $user_message == "q" ]]; then
        echo "Bye. 👋"
        break
    fi

    payload=$(jq -n --arg msg "$user_message" '[$msg]')
    response=$(curl -s -w "\n%{http_code}" -X POST "$URL?n=1" -d "$payload" -H 'Content-type: application/json')

    http_code=$(echo "$response" | tail -n1)
    response_content=$(echo "$response" | head -n-1)
    body=$(echo "$response_content" | jq -r '.body')
    code=$(echo "$response_content" | jq -r '.code')

    if [[ "$http_code" -ne 200 || "$code" -ne 200 ]]; then
        echo "Server responded with error: $http_code, $response_content"
        exit 1
    fi

    body=$(echo "$response_content" | jq -r '.body')
    echo "Bot  > $body"
    echo -e "\n"
done
