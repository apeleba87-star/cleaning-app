#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import subprocess
import sys
from datetime import datetime

def run_git_command(cmd):
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd='.'
        )
        return result.stdout.strip(), result.returncode
    except Exception as e:
        return str(e), 1

# 오늘 날짜의 커밋 조회
print("=" * 60)
print("오늘 날짜의 커밋 목록")
print("=" * 60)
print()

today_output, _ = run_git_command('git log --since="today" --pretty=format:"%h|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M:%S" --all')

if today_output:
    commits = today_output.split('\n')
    for i, commit in enumerate(commits, 1):
        if commit:
            parts = commit.split('|', 3)
            if len(parts) >= 4:
                hash_val, date, author, message = parts[0], parts[1], parts[2], parts[3]
                print(f"{i}. 커밋 해시: {hash_val}")
                print(f"   시간: {date}")
                print(f"   작성자: {author}")
                print(f"   메시지: {message}")
                print()
else:
    print("오늘 날짜의 커밋이 없습니다.")
    print()

print("=" * 60)
print("최근 10개 커밋 (롤백 가능)")
print("=" * 60)
print()

recent_output, _ = run_git_command('git log -10 --pretty=format:"%h|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M:%S" --all')

if recent_output:
    commits = recent_output.split('\n')
    for i, commit in enumerate(commits, 1):
        if commit:
            parts = commit.split('|', 3)
            if len(parts) >= 4:
                hash_val, date, author, message = parts[0], parts[1], parts[2], parts[3]
                print(f"{i}. 커밋 해시: {hash_val}")
                print(f"   시간: {date}")
                print(f"   작성자: {author}")
                print(f"   메시지: {message}")
                print()
else:
    print("커밋을 찾을 수 없습니다.")

print("=" * 60)
print("특정 파일의 변경 이력 (app/(staff)/issues/page.tsx)")
print("=" * 60)
print()

file_output, _ = run_git_command('git log --pretty=format:"%h|%ad|%an|%s" --date=format:"%Y-%m-%d %H:%M:%S" -- "app/(staff)/issues/page.tsx"')

if file_output:
    commits = file_output.split('\n')
    for i, commit in enumerate(commits[:10], 1):  # 최근 10개만
        if commit:
            parts = commit.split('|', 3)
            if len(parts) >= 4:
                hash_val, date, author, message = parts[0], parts[1], parts[2], parts[3]
                print(f"{i}. 커밋 해시: {hash_val}")
                print(f"   시간: {date}")
                print(f"   작성자: {author}")
                print(f"   메시지: {message}")
                print()
else:
    print("해당 파일의 변경 이력이 없습니다.")














