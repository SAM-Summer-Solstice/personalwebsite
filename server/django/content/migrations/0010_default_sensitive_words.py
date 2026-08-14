from django.db import migrations

# 默认敏感词库（中文常见垃圾词 + 英文 spam 高频词）：命中的评论自动进入审核队列。
# 后台可随时增删（content.SensitiveWord），此处仅提供开箱即用的基础词库。
DEFAULT_WORDS = [
    # 中文垃圾/引流
    "加微信", "加V", "加v", "微信红包", "兼职", "刷单", "代开发票", "办证",
    "贷款", "套现", "博彩", "赌场", "六合彩", "中奖", "客服qq", "客服QQ",
    "点击领取", "点击链接", "免费领取", "在家赚钱", "日赚", "代理加盟",
    "色情", "成人视频", "一夜情", "裸聊",
    # 英文 spam
    "casino", "poker online", "cheap viagra", "buy followers", "free money",
    "click here", "make money fast", "seo service", "best price",
    "http://", "https://",
]

def add_default_words(apps, schema_editor):
    SensitiveWord = apps.get_model("content", "SensitiveWord")
    for w in DEFAULT_WORDS:
        SensitiveWord.objects.get_or_create(word=w)


def remove_default_words(apps, schema_editor):
    SensitiveWord = apps.get_model("content", "SensitiveWord")
    SensitiveWord.objects.filter(word__in=DEFAULT_WORDS).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0009_sensitiveword_comment_likes_notification_content_and_more"),
    ]

    operations = [
        migrations.RunPython(add_default_words, remove_default_words),
    ]
