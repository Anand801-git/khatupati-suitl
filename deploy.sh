#!/bin/bash
echo Deploying Khatupati Suits...
git add .
git commit -m "Auto update $(date '+%d %b %Y %H:%M')"
git push
echo Done! Your app will update in 2 minutes.