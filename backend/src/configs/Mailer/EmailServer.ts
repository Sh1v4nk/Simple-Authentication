import { MailtrapClient } from "mailtrap";
import { getEnv } from "@/utils/envValidation";

let client: MailtrapClient | null = null;

const getEmailClient = (): MailtrapClient => {
    if (client) return client;

    const { MAILTRAP_API_TOKEN } = getEnv();
    client = new MailtrapClient({ token: MAILTRAP_API_TOKEN });
    return client;
};

const sender = {
    email: "authhub@emails.shivankpandey.xyz",
    name: "Authentication",
};

export { sender, getEmailClient };
