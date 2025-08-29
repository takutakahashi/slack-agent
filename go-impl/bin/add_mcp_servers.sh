#!/bin/bash
NAME=$1
JSON=$2
claude add-json -s global "$NAME" "$JSON"
