import styles from "@/app/passenger/reserve-bus/page.module.css";
import ChatAdot from "./_components/ChatAdot";

export default async function ChatBotPage() {
    // Render
    return (
        <div className={styles.wrapper}>
            <ChatAdot />
        </div>
    )
}