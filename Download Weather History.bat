@echo off
rem Double-click this file. It opens a window that asks for your Weather
rem Underground API key (hidden as you paste it) and then downloads your
rem station's history. See scripts\Run-History-Download.ps1.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Run-History-Download.ps1"
