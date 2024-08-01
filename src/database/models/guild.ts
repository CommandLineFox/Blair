export interface PendingApplication {
    userId?: string;
    requiredApprovers?: string[];
}

interface Verification {
    message?: string;
    endingMessage?: string;
    questions?: string[];
    log?: string;
    pendingApplications?: PendingApplication[];
    approvers?: string[];
}

interface Questioning {
    ongoingCategory?: string;
    ongoingChannels?: string[];
    log?: string;
}

interface Guide {
    channel?: string;
    message?: string;
}

interface Welcome {
    channel?: string;
    message?: string;
    toggle?: boolean;
}

interface Roles {
    memberRole?: string;
    unverifiedRole?: string;
    staffRoles?: string[]
}

interface Config {
    verification?: Verification;
    questioning?: Questioning;
    guide?: Guide;
    welcome?: Welcome;
    roles?: Roles;
}

export interface DatabaseGuild {
    id: string;
    config?: Config;
}