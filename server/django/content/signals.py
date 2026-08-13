from django.core.files.storage import default_storage
from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from .models import About, Attachment, UserProfile


def _delete_filefield(field):
    if not field or not field.name:
        return
    try:
        default_storage.delete(field.name)
    except Exception:
        pass


@receiver(post_delete, sender=Attachment)
def delete_attachment_file_on_delete(sender, instance, **kwargs):
    _delete_filefield(instance.file)


@receiver(pre_save, sender=Attachment)
def delete_attachment_old_file_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    old = type(instance).objects.filter(pk=instance.pk).first()
    if old is None:
        return
    old_name = old.file.name
    new_name = instance.file.name
    if old_name and old_name != new_name:
        _delete_filefield(old.file)


@receiver(post_delete, sender=UserProfile)
def delete_userprofile_avatar_on_delete(sender, instance, **kwargs):
    _delete_filefield(instance.avatar)


@receiver(pre_save, sender=UserProfile)
def delete_userprofile_old_avatar_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    old = type(instance).objects.filter(pk=instance.pk).first()
    if old is None:
        return
    old_name = old.avatar.name
    new_name = instance.avatar.name
    if old_name and old_name != new_name:
        _delete_filefield(old.avatar)


@receiver(pre_save, sender=About)
def delete_about_old_images_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    old = type(instance).objects.filter(pk=instance.pk).first()
    if old is None:
        return
    for field_name in ("lanyard_image", "card_front_image", "card_back_image"):
        old_field = getattr(old, field_name)
        new_field = getattr(instance, field_name)
        old_name = old_field.name
        new_name = new_field.name
        if old_name and old_name != new_name:
            _delete_filefield(old_field)
