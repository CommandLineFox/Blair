interface Verification {
    guideChannel?: string;
    guideMessage?: string;
    verificationQuestions?: string[];
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
    staffRoles?: string[]
}

interface Config {
    verification?: Verification;
    roles?: Roles;
}

export interface DatabaseGuild {
    id: string;
    config: Config;
}