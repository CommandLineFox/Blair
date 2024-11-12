interface Verification {
    //Message sent in DMs at the start of the verification flow
    message?: string;
    //Message sent at the end of the verification flow
    endingMessage?: string;
    //List of verification questions
    questions?: string[];
    //Channel where verifications get logged to be checked by staff
    log?: string;
    //List of users who are required to approve a user
    approvers?: string[];
    //Serverprotector's join messages channel
    history?: string;
}

interface Questioning {
    //Channel where questioning channels get created
    category?: string;
    //Channel to log the questioning conversations in
    log?: string;
}

interface Guide {
    //The channel to post the guide message in
    channel?: string;
    //The guide message
    message?: string;
}

interface Welcome {
    //The channel to post the welcome message in
    channel?: string;
    //The welcome message
    message?: string;
    //Toggle sending the welcome message
    toggle?: boolean;
}

interface Roles {
    //Member role in the server
    memberRole?: string;
    //Unverified role in the server
    unverifiedRole?: string;
    //Staff roles in the server
    staffRoles?: string[]
}

interface Reason {
    kick?: string[];
    ban?: string[];
}

interface Config {
    verification?: Verification;
    questioning?: Questioning;
    guide?: Guide;
    welcome?: Welcome;
    roles?: Roles;
    reason?: Reason;
}

export interface DatabaseGuild {
    id: string;
    config?: Config;
    ongoingQuestioningChannels?: string[];
}