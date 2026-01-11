import {AttachmentBuilder, ButtonInteraction, Channel, ChatInputCommandInteraction, Client, EmbedBuilder, Guild, GuildBasedChannel, GuildMember, PermissionFlagsBits, Role, StringSelectMenuInteraction, TextChannel, User} from "discord.js";
import Database from "../database/database";
import {PendingApplication} from "../database/models/pendingApllication";
import {getHandlingComponent} from "../types/component";

/**
 * Trim a string to a desired length so it fits within a limit
 * @param str The string to trim
 * @param length The length to trim to
 * @returns The trimmed string
 */
export function trimString(str: string, length: number): string {
    return str.length > length ? `${str.substring(0, length - 3).trim()}...` : str;
}

/**
 * Posts someone's pending application into the verification log channel
 * @param guild Guild of the verification
 * @param interaction Button interaction of the confirm or retry button
 * @param user The user that is verifying
 * @param pendingApplication The pending application
 */
export async function postVerificationMessage(guild: Guild, interaction: ButtonInteraction, user: User, pendingApplication: PendingApplication): Promise<void> {
    const database = Database.getInstance();

    const verificationLogChannel = await database.getVerificationLog(guild);
    if (!verificationLogChannel) {
        await interaction.editReply({ content: "Couldn't find the verification log channel." });
        return;
    }

    //Check if the bot can send messages in the verification log
    const permissions = verificationLogChannel.permissionsFor(interaction.client.user);
    if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
        await interaction.editReply({ content: "The bot doesn't have the send messages permission in that channel." });
        return;
    }

    //Create the embed that will be posted in the verification log
    const verificationEmbed = new EmbedBuilder()
        .setTitle(`Verification for ${user.displayName}`)
        .setThumbnail(user.avatarURL())
        .setTimestamp()
        .addFields([
            { name: "Username", value: user.username },
            { name: "User ID", value: user.id }
        ]);

    const questionAmount = pendingApplication.questions.length;
    const answerAmount = pendingApplication.answers.length;

    //Add all answers including retries to the embed
    let currentQuestion = 0;
    let attempt = 1;
    let answers = "";

    for (let currentAnswer = 0; currentAnswer < answerAmount; currentAnswer++) {
        const question = pendingApplication.questions[currentQuestion];
        const answer = pendingApplication.answers[currentAnswer];

        answers += `**Q${currentQuestion + 1}**: ${answer}\n`;
        if (!question || !answer) {
            continue;
        }

        if (++currentQuestion === questionAmount) {
            verificationEmbed.addFields([{ name: `Attempt ${attempt}`, value: answers.trim() }]);
            currentQuestion = 0;
            attempt++;
            answers = "";
        }
    }

    //Add the required approvals field if there are any
    if (pendingApplication.requiredApprovers.length > 0) {
        const mappedApprovers = pendingApplication.requiredApprovers.map((approver) => `<@${approver}>`).join(", ").trim();
        verificationEmbed.addFields([{ name: "Required approvals", value: mappedApprovers }]);
    }

    //Linkin park references
    if (pendingApplication.attempts === 3) {
        verificationEmbed.addFields({ name: "You tried so hard and got so far", value: "But in the end it doesn't even matter" });
    }

    let verificationMessage = "";
    const verificationMentionRole = await database.getVerificationMentionRole(guild);
    if (verificationMentionRole) {
        verificationMessage = `<@&${verificationMentionRole.id}>`;
    }

    //Post the message with the accept, question, kick and ban buttons
    const row = getHandlingComponent(user.id);
    const verificationLogMessage = await verificationLogChannel.send({ content: verificationMessage, embeds: [verificationEmbed], components: [row] });

    //Add the message ID to the pending application to access it
    await database.setPendingApplicationMessageId(user.id, guild.id, verificationLogMessage.id);
}

/**
 * Check if a specific member of a guild is a staff member
 * @param member The member to check
 * @returns Whether they're staff or not
 */
export async function isStaff(member: GuildMember): Promise<boolean> {
    const database = Database.getInstance();

    const staffRoles = await database.getStaffRoles(member.guild);

    if (!staffRoles) {
        return false;
    }

    for (const staffRole of staffRoles) {
        if (member.roles.cache.has(staffRole.id)) {
            return true;
        }
    }

    return false;
}

/**
 * Get a choice for the reason from the dropdown menu
 * @param interaction The dropdown menu
 * @param channel The channel this is happening in
 * @param staffMember The staff member handling it
 * @returns Reason for moderation
 */
export async function getModerationReason(interaction: StringSelectMenuInteraction, channel: TextChannel, staffMember: GuildMember) {
    const choices = interaction.values;
    let reason: string | undefined = choices[0];

    //Get a custom reason by allowing the staff member to write in the channel for 2 minutes
    if (reason === "Custom") {
        //Set permission override to allow staff member to send messages in the channel
        await channel.permissionOverwrites.create(staffMember, { SendMessages: true });

        try {
            const reply = await interaction.editReply({ content: "Please provide the custom kick reason within 2 minutes:" });

            const collectedMessages = await channel.awaitMessages({ filter: (msg) => msg.author.id === staffMember.id, max: 1, time: 120000, errors: ['time'] });

            const customMessage = collectedMessages.first();
            if (!customMessage) {
                await reply.edit({ content: "No reason was provided in time." });
                return;
            }

            reason = customMessage.content.trim();

            if (customMessage.deletable) {
                await customMessage.delete();
            }
        } catch {
            await interaction.editReply({ content: "Time expired for providing a custom reason." });
            return;
        } finally {
            await channel.permissionOverwrites.delete(staffMember);
        }
    }

    return reason ?? "Banned during verification";
}

/**
 * Log the messages from a questioning channel to the questioning log
 * @param questioningChannel The questioning channel that needs to be logged
 * @param questioningLogChannel The questioning log channel
 * @param member The member that was questioned
 */
export async function logQuestioning(questioningChannel: TextChannel, questioningLogChannel: TextChannel, member: GuildMember) {
    const messages = await (questioningChannel as TextChannel).messages.fetch();

    const logs = messages.reverse().reduce((log, msg) => {
        const timestamp = new Date(msg.createdTimestamp).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', });
        return log + `[${timestamp}] ${msg.author.tag}: ${msg.content}\n`;
    }, '');

    const logBuffer = Buffer.from(logs, 'utf-8');

    await questioningLogChannel.send({ content: `Questioning logs ${member.user.username} (${member.user.id}):`, files: [new AttachmentBuilder(logBuffer, { name: 'questioning_log.txt' })] });
}

/**
 * Checks if the bot's uptime exceeds the specified minimum time.
 * @param client The bot client
 * @returns The remaining time in milliseconds if the bot hasn't reached the uptime or null
 */
export function getRemainingUptime(client: Client): number | null {
    const minUptime = 5 * 60 * 1000;
    const currentTime = Date.now();
    const botStartTime = client.readyTimestamp ?? currentTime;

    // Calculate the elapsed uptime
    const elapsedTime = currentTime - botStartTime;

    // If the bot has exceeded the minimum uptime, return null
    if (elapsedTime >= minUptime) {
        return null;
    }

    // Otherwise, return the remaining time
    return minUptime - elapsedTime;
}

/**
 * Prevent an interaction from running if the bot has been freshly started
 * @param interaction The button or select menu interaction
 */
export async function blockFreshInteraction(interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction): Promise<boolean> {
    const remainingTime = getRemainingUptime(interaction.client);
    if (!remainingTime) {
        return false;
    }

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `The bot is still warming up! Please wait ${Math.ceil(remainingTime / 1000)} more seconds.` });
    } else {
        await interaction.reply({ content: `The bot is still warming up! Please wait ${Math.ceil(remainingTime / 1000)} more seconds.` });
    }

    return true;
}

/**
 * Fetch a member from a guild
 * @param guild The guild to fetch from
 * @param memberId The ID of the member
 */
export async function fetchMember(guild: Guild, memberId: string): Promise<GuildMember | null> {
    try {
        return await guild.members.fetch(memberId);
    } catch (e) {
        return null;
    }
}

/**
 * Fetch a channel from a guild
 * @param guild The guild to fetch from
 * @param channelId The ID of the channel
 */
export async function fetchChannelFromGuild(guild: Guild, channelId: string): Promise<GuildBasedChannel | null> {
    try {
        return await guild.channels.fetch(channelId);
    } catch (e) {
        return null;
    }
}

/**
 * Fetch a channel from the client
 * @param client The client to fetch from
 * @param channelId The ID of the channel
 */
export async function fetchChannelFromClient(client: Client, channelId: string): Promise<Channel | null> {
    try {
        return await client.channels.fetch(channelId);
    } catch (e) {
        return null;
    }
}

/**
 * Fetch a role from a guild
 * @param guild The guild to fetch from
 * @param roleId The ID of the role
 */
export async function fetchRole(guild: Guild, roleId: string): Promise<Role | null> {
    try {
        return await guild.roles.fetch(roleId);
    } catch (e) {
        return null;
    }
}