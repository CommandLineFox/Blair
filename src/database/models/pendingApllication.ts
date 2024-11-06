export interface PendingApplication {
    userId: string;
    guildId: string;
    requiredApprovers: string[];
    questions: string[];
    answers: string[];
    attempts: number;
    messageId?: string;
}