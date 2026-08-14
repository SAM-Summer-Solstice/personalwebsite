"""一次性迁移：把项目根的 content/posts|projects/*.md 与 src/data/about.js 数据导入数据库。"""
import glob
import json
import re
from pathlib import Path
from django.core.management.base import BaseCommand
from content.models import Post, Project, About

BASE = Path(__file__).resolve().parents[5]  # 项目根 d:\xzx\JUST_FOR_FUN\github\personalwebsite


def parse_frontmatter(raw):
    m = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n?", raw)
    if not m:
        return {}, ""
    body = raw[m.end():].strip()
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key, val = key.strip(), val.strip()
        if val.startswith("[") and val.endswith("]"):
            try:
                fm[key] = json.loads(val)
            except json.JSONDecodeError:
                fm[key] = [v.strip().strip("'\"") for v in val[1:-1].split(",") if v.strip()]
        else:
            fm[key] = val.strip("'\"")
    return fm, body


class Command(BaseCommand):
    help = "导入存量 md 内容与 about 数据到数据库"

    def handle(self, *args, **options):
        for path in glob.glob(str(BASE / "content" / "posts" / "*.md")):
            raw = Path(path).read_text(encoding="utf-8")
            fm, body = parse_frontmatter(raw)
            required = ["id", "title", "date", "tags", "excerpt"]
            if any(k not in fm for k in required):
                self.stdout.write(self.style.WARNING(f"跳过缺少字段: {path}"))
                continue
            # 浏览量/点赞数不继承 md frontmatter（那是假数据），一律从 0 开始真实累计；
            # 评论数实时从 Comment 表统计，这里不再导入。
            Post.objects.update_or_create(
                slug=fm["id"],
                defaults={
                    "title": fm["title"],
                    "date": fm["date"],
                    "tags": fm["tags"] if isinstance(fm["tags"], list) else [],
                    "excerpt": fm["excerpt"],
                    "content": body,
                    "views": 0,
                    "likes": 0,
                },
            )
            self.stdout.write(f"Post 导入: {fm['title']}")

        for path in glob.glob(str(BASE / "content" / "projects" / "*.md")):
            raw = Path(path).read_text(encoding="utf-8")
            fm, _ = parse_frontmatter(raw)
            required = ["id", "name", "emoji", "tagline", "description", "tech", "status", "date"]
            if any(k not in fm for k in required):
                self.stdout.write(self.style.WARNING(f"跳过缺少字段: {path}"))
                continue
            Project.objects.update_or_create(
                slug=fm["id"],
                defaults={
                    "name": fm["name"],
                    "emoji": fm.get("emoji", ""),
                    "tagline": fm.get("tagline", ""),
                    "description": fm.get("description", ""),
                    "tech": fm["tech"] if isinstance(fm["tech"], list) else [],
                    "status": fm["status"],
                    "date": fm["date"],
                    "url": fm.get("url", ""),
                    "github": fm.get("github", ""),
                    "related": fm["related"] if isinstance(fm.get("related"), list) else [],
                },
            )
            self.stdout.write(f"Project 导入: {fm['name']}")

        if not About.objects.exists():
            about = {
                "name": "XU",
                "school": "BIT AUTOMATION",
                "grade": "2024",
                "birth_year": 2006,
                "intro": [
                    "你好，欢迎来到我的小站。我是一个对机器人、运动控制与具身智能充满好奇的大学生，喜欢把电机转起来、把倒立摆立起来、让小车自己跑起来，也喜欢把这一切写成文字。",
                    "我认为机器人最迷人的地方在于“知行合一”：数学在纸上推导是一回事，电机在手上转动是另一回事。这个博客记录的就是这两者之间的所有折腾、踩坑与顿悟。",
                ],
                "directions": [
                    "运动控制：PID / 前馈 / 阻抗控制的工程实践",
                    "步态规划与四足机器人",
                    "强化学习在机器人控制中的应用",
                    "机械臂运动学与轨迹规划",
                ],
                "interests": ["嵌入式开发", "开源硬件", "街拍与摄影", "科幻小说", "深夜写代码时听后摇"],
                "contact": {
                    "email": "",
                    "github": "",
                    "location": "Beijing",
                },
                "blog_purpose": [
                    "写博客最初是为了逼自己把问题想清楚：一个知识点如果能用大白话讲给别人听，才算真正掌握。后来发现，记录本身也成了学习的一部分。",
                    "这里既会有严肃的技术笔记，也会有失败现场的完整复盘——因为踩过的坑，往往比成功的参数更有分享价值。希望这些文字对同样在路上的你有哪怕一点帮助。",
                ],
            }
            # 首次建库的默认 About 记录；线上实际内容以后台（/admin/）维护为准
            About.objects.create(**about)
            self.stdout.write("About 初始记录已创建")
