@echo off
cd /d "C:\Users\qianq\.qclaw\skills\daily-video-factory"
"C:\Program Files\Git\cmd\git.exe" add README.md
"C:\Program Files\Git\cmd\git.exe" commit -m "Simplify README: remove FAQ and changelog sections"
"C:\Program Files\Git\cmd\git.exe" push
