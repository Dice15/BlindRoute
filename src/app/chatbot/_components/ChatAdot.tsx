"use client"

import styled from "styled-components";
import Image from 'next/image';
import { useState, useCallback, useEffect, useRef } from 'react';
import { SpeechInputProvider, SpeechOutputProvider } from "@/core/modules/speech/SpeechProviders";
import { getGptMessage } from "../_functions/getGptMessage";
import { useRouter } from "next/navigation";
import { VibrationProvider } from "@/core/modules/vibration/VibrationProvider";
import { useSwipeable } from "react-swipeable";
import LoadingAnimation from "@/app/_components/LoadingAnimation";


export default function ChatAdot() {
    // hook
    const router = useRouter();


    // ref
    const isRecognitionActive = useRef<Boolean>(false);
    const focusBlank = useRef<HTMLDivElement>(null);


    // state
    const [chatMode, setChatMode] = useState<"chat" | "blindroute">("chat");
    const [userMessage, setUserMessage] = useState<string | null>(null);
    const [gptMessage, setGptMessage] = useState<string | null>(null);
    const [waitingGpt, setWaitingGpt] = useState<boolean>(false);
    const [displayPageGuide, setDisplayPageGuide] = useState<boolean>(false);


    // handler
    const handleGoBack = useCallback(() => {
        SpeechOutputProvider.speak(" ").then(() => {
            router.replace('/');
        });
    }, [router]);


    const handlePageGuideOpen = useCallback(() => {
        setDisplayPageGuide(true);
    }, []);


    const handlePageGuideClose = useCallback(() => {
        setDisplayPageGuide(false);
    }, []);


    const handleHorizontalSwipe = useSwipeable({
        onSwipedRight: useCallback(() => {
            handleGoBack()
        }, [handleGoBack]),
        trackMouse: true
    });


    const handleNavigation = useCallback((start: string, destination: string) => {
        const params = new URLSearchParams({
            start: start,
            destination: destination,
        });
        router.push(`/blindroute?${params.toString()}`);
    }, [router]);


    const handleSendMessage = useCallback((message: string) => {
        switch (chatMode) {
            case "chat": {
                setWaitingGpt(true);
                getGptMessage(message, chatMode).then(async (value) => {
                    setWaitingGpt(false);
                    if (value.data.chatMode === "blindroute") {
                        setGptMessage("시각장애인 전용 길안내를 시작하겠습니다. 출발지와 목적지를 말해주세요.");
                        setChatMode("blindroute");
                    }
                    else {
                        setGptMessage(value.data.message.length > 0 ? value.data.message : "이해를 잘 못했습니다. 다시 말해주세요.");
                    }
                });
                break;
            }
            case "blindroute": {
                setWaitingGpt(true);
                getGptMessage(message, chatMode).then(async (value) => {
                    setWaitingGpt(false);
                    const route = value.data.message.split(',');
                    if (route.length === 2) {
                        handleNavigation(route[0], route[1]);
                        // SpeechOutputProvider.speak(`출발지 ${route[0]}와 목적지 ${route[1]}가 입력되었습니다. 상세 목적지를 검색하겠습니다.`).then(() => {
                        //     setTimeout(() => {
                        //         handleNavigation(route[0], route[1])
                        //     }, 500);
                        // });
                    }
                    else {
                        setGptMessage("출발지와 도착지를 다시 말해주세요.");
                    }
                });
                break;
            }
        }

    }, [chatMode, handleNavigation]);


    const handleSubmitText = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            setUserMessage(event.currentTarget.value);
            setGptMessage("");
            handleSendMessage(event.currentTarget.value);
            event.currentTarget.value = "";
            event.preventDefault();
        }
    }, [handleSendMessage]);


    const handleSubmitSpeak = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isRecognitionActive.current) return;
        isRecognitionActive.current = true;
        VibrationProvider.vibrate(500);
        SpeechOutputProvider.stopSpeak();
        SpeechInputProvider.startRecognition({
            onResult: (result: string) => {
                const maxLength = 100;
                const inputText = Array.from(result).slice(0, maxLength).join('');
                setUserMessage(inputText);
                setGptMessage("");
                handleSendMessage(inputText);
                isRecognitionActive.current = false;
            },
            onAutoStop: () => {
                isRecognitionActive.current = false;
            },
        });
    }, [handleSendMessage]);


    const handleTouchUserMessage = useCallback(() => {
        if (userMessage && userMessage.length > 0) {
            SpeechOutputProvider.speak(userMessage);
        }
    }, [userMessage]);


    const handleTouchGptMessage = useCallback(() => {
        if (gptMessage && gptMessage.length > 0) {
            SpeechOutputProvider.speak(gptMessage);
        }
    }, [gptMessage]);


    // effect
    useEffect(() => {
        setGptMessage("안녕하세요, 저는 당신의 AI 비서 에이닷입니다.");
    }, []);


    useEffect(() => {
        if (gptMessage) {
            SpeechOutputProvider.speak(gptMessage);
        }
    }, [gptMessage])


    return (
        <Wrapper {...handleHorizontalSwipe}>
            {displayPageGuide &&
                <PageGuideImage onClick={handlePageGuideClose}>
                    <Image src="/images/blindroute_page_guide_chat_bot.png" alt="page_guide" fill priority />
                </PageGuideImage>
            }
            <LoadingAnimation active={waitingGpt} invisibleBackground={true} />
            <BackImage >
                <Image src="/images/chat_adot_background.png" alt="guide01" fill priority />
            </BackImage >

            <PageGuideButton onClick={handlePageGuideOpen}>
                {'ⓘ 사용 가이드 (보호자 전용)'}
            </PageGuideButton>

            <UserMessage onClick={handleTouchUserMessage}>
                {userMessage || ""}
            </UserMessage>

            <ReturnMessage onClick={handleTouchGptMessage}>
                {gptMessage || ""}
            </ReturnMessage>

            <MessageInputField>
                <TextInputField>
                    <input
                        type="text"
                        placeholder="메시지를 입력하세요..."
                        onKeyDown={handleSubmitText}
                        style={{ width: '100%', height: '100%', fontSize: "4vw" }}
                    />
                </TextInputField>
                <SpeakInputField
                    onClick={handleSubmitSpeak} >
                </SpeakInputField>
            </MessageInputField>
            <FocusBlank ref={focusBlank} tabIndex={0} />
        </Wrapper >
    );
}

const Wrapper = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const FocusBlank = styled.div`
    height:0px;
    width: 85%;
`;

const BackImage = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 100;
`;

const PageGuideImage = styled.div`
    position: fixed;
    opacity: 0.95;
    top:7.5%;
    height: 92.5%;
    width: 100%;
    z-index: 500;
    background-color: #D9D9D9;
`;

const PageGuideButton = styled.div`
    position: fixed;
    z-index: 101;
    top: 20%;
    background-color: #F2F3F6;
    height: 5%;
    width: calc(50% - 4vw);
    margin-left: 50%;
    padding: 2vw 3vw 2vw 1vw;
    text-align: right;
    font-size: 3.5vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;

const UserMessage = styled.p`
    position: fixed;
    top: 25%;
    width: calc(100% - 14%);
    margin: 2% 7%;
    z-index: 101;
    font-size: 5vw;
    font-weight: bold;
    color: #666e7e;
    white-space: normal; 
    overflow-wrap: break-word;
    user-select: none;
`;

const ReturnMessage = styled.p`
    position: fixed;
    top: 35%;
    width: calc(100% - 14% - 3%);
    margin: 2% 7%;
    padding-left: 3%;
    border-left: 0.2em solid #666e7e;
    z-index: 101;
    font-size: 5vw;
    font-weight: bold;
    color: #666e7e;
    white-space: normal;
    overflow-wrap: break-word;
    user-select: none;
`;


const MessageInputField = styled.div`
    position: fixed;
    top: 82%;
    height: 6.5%;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 101;
`;

const TextInputField = styled.div`
    margin-left: 10%;
    height: 100%;
    width: 65%;
    padding: 0;
    z-index: 101;
`;

const SpeakInputField = styled.div`
    height: 100%;
    width: 10%;
    z-index: 101;
`;