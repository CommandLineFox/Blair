interface Question {
    index?: number;
    text?: string;
}

interface Verification {
    guideChannel?: string;
    guideMessage?: string;
    verificationQuestions?: Question[];
    verificationLog?: string;
    questioningCategory?: string;
    questioningChannels?: string[];
    questioningLog?: string;
    welcomeChannel?: string;
    welcomeMessage?: string;
    welcomeToggle?: boolean;
    pendingApplications?: string[];
}

interface Roles {
    memberRole?: string;
    unverifiedRole?: string;
}

interface Config {
    verification?: Verification;
    roles?: Roles;
}

export interface DatabaseGuild {
    id: string;
    config: Config;
}