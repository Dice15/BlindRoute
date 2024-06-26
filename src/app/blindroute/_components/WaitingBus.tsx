"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import 'swiper/css';
import styled from "styled-components";
import { PathFinderStep } from "./PathFinder";
import { SpeechOutputProvider } from "@/core/modules/speech/SpeechProviders";
import { IForwarding } from "@/models/IForwarding";
import { IBusArrival } from "@/models/IBusArrival";
import { getBusArrival } from "../_functions/getBusArrival";
import LoadingAnimation from "@/app/_components/LoadingAnimation";
import { VibrationProvider } from "@/core/modules/vibration/VibrationProvider";
import Image from "next/image";


interface WaitingBusProps {
    setStep: React.Dispatch<React.SetStateAction<PathFinderStep>>;
    forwarding: IForwarding | null;
    setOnBoardVehId: React.Dispatch<React.SetStateAction<string | null>>
}


export default function WaitingBus({ setStep, forwarding, setOnBoardVehId }: WaitingBusProps) {
    // ref
    const WaitingBusInfoContainerRef = useRef<HTMLDivElement>(null);
    const focusBlank = useRef<HTMLDivElement>(null);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);


    // state
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [busArrival, setBusArrival] = useState<IBusArrival | null>(null);
    const [displayPageGuide, setDisplayPageGuide] = useState<boolean>(false);


    // handler
    const handleGoBack = useCallback(() => {
        if (intervalIdRef.current !== null) {
            clearInterval(intervalIdRef.current);
        }

        SpeechOutputProvider.speak("버스 예약을 취소하였습니다.").then(() => {
            setStep("reservationBusConfirm");
        });

    }, [setStep]);


    const handleGoNext = useCallback(() => {
        if (intervalIdRef.current !== null) {
            clearInterval(intervalIdRef.current);
        }

        if (busArrival) {
            VibrationProvider.vibrate(8000);
            setTimeout(() => {
                setOnBoardVehId(busArrival.busVehId1);
                setStep("reservationDesConfirm");
            }, 8000);
            SpeechOutputProvider.speak("버스가 도착했습니다.");
        }

    }, [setStep, setOnBoardVehId, busArrival]);


    const handlePageGuideOpen = useCallback(() => {
        setDisplayPageGuide(true);
    }, []);


    const handlePageGuideClose = useCallback(() => {
        setDisplayPageGuide(false);
    }, []);


    const handleHorizontalSwipe = useSwipeable({
        onSwipedLeft: useCallback(() => {
            handleGoNext();
        }, [handleGoNext]),
        onSwipedRight: useCallback(() => {
            handleGoBack()
        }, [handleGoBack]),
        trackMouse: true
    });


    const handleSpeak = useCallback((init: boolean, forwarding: IForwarding, busArrival: IBusArrival) => {
        const text = `
            ${forwarding.busRouteNm} 버스를 대기중입니다.  
            ${busArrival.busArrMsg1}.
            ${busArrival.busArrMsg2}.
            ${init ? "오른쪽으로 스와이프하면 버스 대기 예약을 취소합니다." : ""}     
        `;
        return SpeechOutputProvider.speak(text);
    }, []);


    const handleTouch = useCallback(() => {
        if (forwarding && busArrival) {
            handleSpeak(false, forwarding, busArrival);
        }
    }, [forwarding, busArrival, handleSpeak]);


    const handleCheckBusArrival = useCallback(async () => {
        if (!forwarding) return;
        getBusArrival(forwarding).then((newBusArrival) => {
            if (busArrival && busArrival.busVehId1 !== '' && newBusArrival.data.busArrival.busVehId1 !== busArrival.busVehId1) {
                handleGoNext();
            }
            else {
                setBusArrival(newBusArrival.data.busArrival);
            }
        });
    }, [forwarding, busArrival, handleGoNext]);


    // effect
    useEffect(() => {
        VibrationProvider.vibrate(500);
    }, []);


    useEffect(() => {
        if (isLoading && forwarding && busArrival) {
            setIsLoading(false);
            handleSpeak(true, forwarding, busArrival);
        }
    }, [forwarding, isLoading, busArrival, handleSpeak])


    useEffect(() => {
        if (intervalIdRef.current !== null) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        if (isLoading) {
            handleCheckBusArrival();
        }
        intervalIdRef.current = setInterval(handleCheckBusArrival, 15000);

        return () => {
            if (intervalIdRef.current !== null) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
        }
    }, [isLoading, handleCheckBusArrival])


    // render
    return (
        <Wrapper {...handleHorizontalSwipe}>
            {displayPageGuide &&
                <PageGuideImage onClick={handlePageGuideClose}>
                    <Image src="/images/blindroute_page_guide_waiting_bus.png" alt="page_guide" fill priority />
                </PageGuideImage>
            }
            <LoadingAnimation active={isLoading} />
            <WaitingBusInfoContainer ref={WaitingBusInfoContainerRef}>
                <PageGuideButton onClick={handlePageGuideOpen}>
                    {'ⓘ 사용 가이드 (보호자 전용)'}
                </PageGuideButton>
                <WaitingBusInfo onClick={handleTouch}>
                    {(busArrival && forwarding) && <>
                        <ReservationType>
                            {'(버스 승차 대기)'}
                        </ReservationType>
                        <BusName>
                            {`${forwarding.busRouteNm} 버스`}
                        </BusName>
                    </>}
                    {busArrival &&
                        <BusArrMsg>
                            {busArrival.busArrMsg1}
                        </BusArrMsg>
                    }
                </WaitingBusInfo>
            </WaitingBusInfoContainer>
            <FocusBlank ref={focusBlank} tabIndex={0} />
        </Wrapper >
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

const PageGuideImage = styled.div`
    position: fixed;
    opacity: 0.95;
    top:7.5%;
    height: 92.5%;
    width: 100%;
    z-index: 500;
    background-color: #D9D9D9;
`;

const WaitingBusInfoContainer = styled.div`
    height: 92.5%;
    width: 85%;
    border: 0.7vw solid var(--main-border-color);
    border-radius: 4vw;
    color: var(--main-font-color);
`;

const PageGuideButton = styled.div`
    height: calc(7.5vw - 4vw);
    width: calc(100% - 4vw);
    padding: 2vw 3vw 2vw 1vw;
    text-align: right;
    font-size: 3.5vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;

const WaitingBusInfo = styled.div`
    height: calc(100% - 7vw);
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;

const ReservationType = styled.h2` 
    text-align: center;
    margin-bottom: 3vw;
    font-size: 6vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;

const BusName = styled.h1` 
    text-align: center;
    margin-bottom: 8vw;
    font-size: 7.5vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;

const BusArrMsg = styled.h3`
    margin-bottom: 14vw;
    text-align: center;
    font-size: 5vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;