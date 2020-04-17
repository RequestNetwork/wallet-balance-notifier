#!/bin/sh
gcloud functions deploy sync-wallet-balance \
  --source https://source.developers.google.com/projects/request-240714/repos/wallet-balance-notifier/moveable-aliases/master/paths/dist \
  --runtime nodejs8 \
  --trigger-topic sync-wallet-balance \
  --entry-point main
