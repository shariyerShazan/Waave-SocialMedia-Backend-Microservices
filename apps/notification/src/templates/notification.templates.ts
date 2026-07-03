export interface NotificationTemplate {
  title: string;
  body: string;
}

export function getTemplate(
  type: string,
  data: Record<string, any>,
): NotificationTemplate {
  const fromUser = (data.fromUserName as string) || 'Someone';
  const textContent = (data.text as string) || '';

  const templates: Record<string, NotificationTemplate> = {
    like: {
      title: 'New Like',
      body: `${fromUser} liked your post`,
    },
    comment: {
      title: 'New Comment',
      body: `${fromUser} commented: "${textContent.substring(0, 50)}"`,
    },
    follow: {
      title: 'New Follower',
      body: `${fromUser} started following you`,
    },
    unfollow: {
      title: 'Unfollow',
      body: `${fromUser} unfollowed you.`,
    },
    mention: {
      title: 'Mentioned You',
      body: `${fromUser} mentioned you in a post`,
    },
    share: {
      title: 'Post Shared',
      body: `${fromUser} shared your post`,
    },
    message: {
      title: 'New Message',
      body: `${fromUser}: ${textContent.substring(0, 50)}`,
    },
    group_invite: {
      title: '👥 Group Invite',
      body: `${fromUser} added you to ${(data.groupName as string) || 'a group'}`,
    },
    post_tag: {
      title: 'Tagged in Post',
      body: `${fromUser} tagged you in a post`,
    },
    birthday: {
      title: 'Birthday',
      body: `Today is ${fromUser}'s birthday!`,
    },
    system: {
      title: (data.title as string) || 'Notification',
      body: (data.body as string) || 'You have a new notification',
    },
  };

  return templates[type] || templates.system;
}
