export const KAFKA_BROKERS = process.env.KAFKA_BROKERS ?? 'localhost:9092';
export const KAFKA_CLIENT_ID = 'facebook';
export const KAFKA_CONSUMER_GROUP = 'facebook-consumer';

export const KAFKA_SERVICE = 'KAFKA_SERVICE';

//kafka topics
export const KAFKA_TOPICS = {
  //AUTH EVENTS
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_FORGOT_PASS_REQUEST: 'user.forgot-pass-request',

  //EVENT EVENTS
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_CANCELLED: 'event.cancelled',
  EVENT_PUBLISHED: 'event.published',

  // TICKET EVENTS
  TICKET_PURCHASED: 'ticket.purchased',
  TICKET_CANCELLED: 'ticket.cancelled',
  TICKET_CHECKED_IN: 'ticket.checked-in',

  //PAYMENT EVENTS
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // NOTIFICATION EVENTS
  SEND_MAIL: 'notification.send-mail',
  SEND_PUSH: 'notification.send-push',
};

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
