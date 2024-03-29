"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeechInputProvider, SpeechOutputProvider } from "@/core/modules/speech/SpeechProviders";
import LoadingAnimation from "@/app/_components/LoadingAnimation";
import { ReserveBusStep } from "./ReserveBus";
import { VibrationProvider } from "@/core/modules/vibration/VibrationProvider";
import styled from "styled-components";
import { getStations } from "@/core/api/blindrouteApi";
import { Station } from "@/core/type/Station";
import { useSwipeable } from "react-swipeable";
import { useRouter } from "next/navigation";



/** SearchStation 컴포넌트 프로퍼티 */
interface SearchStationProps {
    setStep: React.Dispatch<React.SetStateAction<ReserveBusStep>>;
    setStations: React.Dispatch<React.SetStateAction<Station[]>>;
}



/** SearchStation 컴포넌트 */
export default function SearchStation({ setStep, setStations }: SearchStationProps) {
    // Const
    const router = useRouter();


    // Refs
    const audioContainer = useRef<HTMLAudioElement>(null);
    const audioSource = useRef<HTMLSourceElement>(null);
    const focusBlankRef = useRef<HTMLDivElement>(null);


    // States
    const [isFirstAnnouncement, setIsFirstAnnouncement] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [stationName, setStationName] = useState<string>("");


    // Handler
    /** 안내 음성 */
    const handleAnnouncement = useCallback((type: "guide" | "noWordsDetected" | "noStationsFound") => {
        //return;
        switch (type) {
            case "guide": {
                if (isFirstAnnouncement) {
                    const delay = 700;
                    for (let i = 0; i < delay; i += 50) {
                        setTimeout(() => { SpeechOutputProvider.speak(" "); }, i);
                    }
                    setTimeout(() => {
                        SpeechOutputProvider.speak("정류장 검색 페이지입니다. 텍스트 또는 음성인식으로 입력할 수 있습니다. 입력 후 왼쪽으로 스와이프하면 정류장 검색을 시작합니다.");
                        setIsFirstAnnouncement(false);
                    }, delay)
                } else {
                    SpeechOutputProvider.speak("정류장 검색 페이지입니다. 텍스트 또는 음성인식으로 입력할 수 있습니다. 입력 후 왼쪽으로 스와이프하면 정류장 검색을 시작합니다.");
                }
                break;
            }
            case "noWordsDetected": {
                SpeechOutputProvider.speak("인식된 단어가 없습니다. 다시 시도해주세요.");
                break;
            }
            case "noStationsFound": {
                SpeechOutputProvider.speak(`'${stationName}'가 이름에 포함된 정류장이 없습니다`);
                break;
            }
        }
    }, [isFirstAnnouncement, stationName]);


    /** 버스 정류장 이름 음성 인식 */
    const handleStationNameSTT = useCallback(() => {
        SpeechInputProvider.startRecognition((result: string) => {
            const maxLength = 30;
            const inputText = Array.from(result).slice(0, maxLength).join('');
            setStationName(inputText);
        });
    }, []);


    /** 음성 인식 종료 */
    const handleStopSTT = useCallback(() => {
        SpeechInputProvider.stopRecognition();
    }, []);


    /** 이전 단계로 이동 */
    const handleBackToHome = useCallback(() => {
        setIsLoading(false);
        router.replace("../");
    }, [router]);


    /** 버스 데이터 가져오기 */
    const handleGetStations = useCallback(() => {
        if (stationName === "") {
            handleAnnouncement("noWordsDetected");
        } else {
            getStations(stationName).then(({ msg, itemList }) => {
                if (msg === "정상적으로 처리되었습니다." && itemList.length > 0) {
                    setStations(itemList);
                    setTimeout(() => {
                        setIsLoading(false);
                        setStep("selectStation");
                    }, 1000)
                } else {
                    setIsLoading(false);
                    handleAnnouncement("noStationsFound");
                }
            });
        }
    }, [handleAnnouncement, setStations, setStep, stationName]);


    /** 음성 인식 시작 */
    const handleVoiceRecognition = useCallback(() => {
        SpeechOutputProvider.stopSpeak();
        handleStationNameSTT();
    }, [handleStationNameSTT]);


    /** horizontal 스와이프 이벤트 */
    const handleHorizontalSwiper = useSwipeable({
        onSwipedLeft: useCallback(() => {
            setIsLoading(true);
            VibrationProvider.vibrate(1000);
            setTimeout(() => {
                handleStopSTT();
                handleGetStations();
            }, 1000);
        }, [handleGetStations, handleStopSTT]),
        onSwipedRight: useCallback(() => {
            VibrationProvider.vibrate(1000);
            handleStopSTT();
            setIsLoading(true);
            handleBackToHome();
        }, [handleBackToHome, handleStopSTT]),
        trackMouse: true
    });


    /* Effect */
    useEffect(() => {
        if (focusBlankRef.current) {
            focusBlankRef.current.focus();
        }
    }, []);


    useEffect(() => {
        if (isFirstAnnouncement) {
            handleAnnouncement("guide");
        }
    }, [isFirstAnnouncement, handleAnnouncement])


    // Render
    return (
        <Wrapper {...handleHorizontalSwiper}>
            <LoadingAnimation active={isLoading} />
            <audio ref={audioContainer}>
                <source ref={audioSource} />
            </audio>

            <StationNameContainer tabIndex={1} >
                <TextareaStationName placeholder="정류장 입력" maxLength={50} value={stationName} onChange={(e) => setStationName(e.target.value)} />
            </StationNameContainer>
            <ButtonVoiceRecognition
                onClick={handleVoiceRecognition}
                tabIndex={2}
            >
                {"음성인식 시작"}
            </ButtonVoiceRecognition>
            <FocusBlank ref={focusBlankRef} tabIndex={0} />
        </Wrapper>
    );
}


const Wrapper = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;


const FocusBlank = styled.div`
    height:0px;
    width: 85%;
`;


const StationNameContainer = styled.div`
    height: calc(90% - 15vw - 2.5vw - 1px - 7.5vw);
    width: 85%;
    margin-bottom: 7.5vw;
    border: 1px solid var(--main-border-color);
    border-radius: 8px;
    background-color: var(--main-color);
    color: var(--main-font-color);
    display: flex;
    flex-direction: column;
    justify-content: center; 
    align-items: center;
    padding: 2vw 0;
`;


const TextareaStationName = styled.textarea`
    width: 95%;
    height: 30vw;
    border: 0;
    background-color: var(--button-color);
    color: var(--button-text-color);
    font-size: 7vw;
    font-weight: bold;
    text-align: center;
    resize: none;
    user-select: none;
    &:focus {
        outline: none;  // 포커스 시 아웃라인 제거
    }
`;

const ButtonVoiceRecognition = styled.button`
    width: 85%;
    height: 15vw;
    font-size: 5vw;
    margin-bottom: 2%.5;
    border: 1px solid var(--main-border-color);
    border-radius: 8px;
    background-color: var(--main-color);
    color: var(--main-font-color);
    user-select: none;
`;