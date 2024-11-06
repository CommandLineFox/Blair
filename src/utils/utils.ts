import Database from "database/database";
import { PendingApplication } from "database/models/pendingApllication";
import { ButtonInteraction, EmbedBuilder, Guild, GuildMember, PermissionFlagsBits, User } from "discord.js";
import { getHandlingComponent } from "types/component";

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
export async function postVerificationMessage(guild: Guild, interaction: ButtonInteraction, user: User, pendingApplication: PendingApplication, edit?: boolean): Promise<void> {
    const database = Database.getInstance();

    const verificationLogChannel = await database.getVerificationLog(guild);
    if (!verificationLogChannel) {
        if (edit) {
            await interaction.editReply({ content: "Couldn't find the verification log channel." });
        } else {
            await interaction.reply({ content: "Couldn't find the verification log channel.", ephemeral: true });
        }

        return;
    }


    const permissions = verificationLogChannel.permissionsFor(interaction.client.user);
    if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
        if (edit) {
            await interaction.editReply({ content: "The bot doesn't have the send messages permission in that channel" });
        } else {
            await interaction.reply({ content: "The bot doesn't have the send messages permission in that channel", ephemeral: true });
        }

        return;
    }

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

    let j = 0;
    for (let i = 0; i < answerAmount; i++) {
        const question = pendingApplication.questions[j];
        const answer = pendingApplication.answers[i];
        if (!question || !answer) {
            continue;
        }

        if (++j === questionAmount) {
            j = 0;
        }

        verificationEmbed.addFields([{ name: question, value: answer }]);
    }

    if (pendingApplication.requiredApprovers.length > 0) {
        const mappedApprovers = pendingApplication.requiredApprovers.map((approver) => `<@${approver}>`).join(", ").trim();
        verificationEmbed.addFields([{ name: "Required approvals", value: mappedApprovers }]);
    }

    if (pendingApplication.attempts === 3) {
        verificationEmbed.addFields({ name: "You tried so hard and got so far", value: "But in the end it doesn't even matter" });
    }
    const row = getHandlingComponent();
    const verificationLogMessage = await verificationLogChannel.send({ embeds: [verificationEmbed], components: [row] });

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