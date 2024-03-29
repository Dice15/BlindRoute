"use client"


import { ReserveBusStep } from "./ReserveBus";
import { useCallback, useEffect, useRef, useState } from "react";
import LoadingAnimation from "@/app/_components/LoadingAnimation";
import { Swiper, SwiperClass, SwiperSlide } from "swiper/react";
import 'swiper/css';
import styled from "styled-components";
import { VibrationProvider } from "@/core/modules/vibration/VibrationProvider";
import { SpeechOutputProvider } from "@/core/modules/speech/SpeechProviders";
import { Bus } from "@/core/type/Bus";
import { Station } from "@/core/type/Station";
import { reserveBus } from "@/core/api/blindrouteApi";
import { useSwipeable } from "react-swipeable";
import { Boarding, BoardingBuilder } from "@/core/type/Boarding";



interface SelectBusProps {
    setStep: React.Dispatch<React.SetStateAction<ReserveBusStep>>;
    selectedStation: Station;
    buses: Bus[];
    setBoarding: React.Dispatch<React.SetStateAction<Boarding | null>>;
}



export default function SelectBus({ setStep, selectedStation, buses, setBoarding }: SelectBusProps) {
    /* Ref */
    const busInfoContainer = useRef<HTMLDivElement>(null);
    const busListIndexRef = useRef<number>(0);
    const isSlidingRef = useRef(false);
    const focusBlankRef = useRef<HTMLDivElement>(null);


    /* State */
    const [isFirstRender, setIsFirstRender] = useState(true);
    const [isLoading, setIsLoading] = useState(false);


    // Handler
    /** 안내 음성 */
    const handleAnnouncement = useCallback((type: "currBus" | "failedReservation" | "noVehicleFound") => {
        switch (type) {
            case "currBus": {
                const bus = buses[busListIndexRef.current];
                if (isFirstRender) {
                    const delay = 700;
                    for (let i = 0; i < delay; i += 50) {
                        setTimeout(() => { SpeechOutputProvider.speak(" "); }, i);
                    }
                    setTimeout(() => {
                        const guide = isFirstRender ? "버스를 선택하세요. 위아래 스와이프로 버스를 선택할 수 있습니다." : "";
                        SpeechOutputProvider.speak(`${guide} "${bus.busRouteAbrv || bus.busRouteNm}번", ${bus.adirection} 방면. 왼쪽으로 스와이프하면 버스를 선택합니다.`);
                        setIsFirstRender(false);
                    }, delay)
                } else {
                    SpeechOutputProvider.speak(`"${bus.busRouteAbrv || bus.busRouteNm}번", ${bus.adirection} 방면. 왼쪽으로 스와이프하면 버스를 선택합니다.`);
                }
                break;
            }
            case "failedReservation": {
                SpeechOutputProvider.speak(`버스를 예약하는데 실패했습니다`);
                break;
            }
            case "noVehicleFound": {
                SpeechOutputProvider.speak("지금은 운행하는 버스가 없습니다.")
                break;
            }
        }
    }, [buses, isFirstRender]);


    /** 이전 단계로 이동 */
    const handleBackToPrev = useCallback(() => {
        setIsLoading(false);
        setStep("selectStation");
    }, [setStep]);


    /** 버스 예약 */
    const handleReserveBus = useCallback(() => {
        reserveBus(selectedStation.stId, selectedStation.arsId, buses[busListIndexRef.current].busRouteId, "boarding").then(({ msg, reservationId }) => {
            if (msg === "정상적으로 처리되었습니다." && reservationId !== null) {
                setBoarding(new BoardingBuilder(selectedStation, buses[busListIndexRef.current])
                    .reservationId(reservationId)
                    .build());
                setTimeout(() => {
                    setIsLoading(false);
                    setStep("waitingBus");
                }, 1000);
            } else if (msg === "운행 종료되었습니다.") {
                setIsLoading(false);
                handleAnnouncement("noVehicleFound");
            } else {
                setIsLoading(false);
                handleAnnouncement("failedReservation");
            }
        });
    }, [buses, handleAnnouncement, selectedStation, setBoarding, setStep]);


    /** 스와이프로 아이템이 변경되었을 때 발생하는 이벤트 */
    const handleSlideChange = useCallback((swiper: SwiperClass) => {
        VibrationProvider.vibrate(200);
        isSlidingRef.current = true; // 슬라이드 중으로 상태 변경
        busListIndexRef.current = swiper.realIndex;

        handleAnnouncement("currBus");
        setTimeout(() => isSlidingRef.current = false, 250); // 300ms는 애니메이션 시간에 맞게 조정
    }, [handleAnnouncement]);


    /** horizontal 스와이프 이벤트 */
    const handleHorizontalSwiper = useSwipeable({
        onSwipedLeft: useCallback(() => {
            setIsLoading(true);
            setTimeout(() => { handleReserveBus(); }, 500);
        }, [handleReserveBus]),
        onSwipedRight: useCallback(() => {
            setIsLoading(true);
            handleBackToPrev();
        }, [handleBackToPrev]),
        trackMouse: true
    });


    /** vertical 스와이프 아이템 터치 이벤트 */
    const handleBusInfoClick = useCallback(() => {
        VibrationProvider.vibrate(1000);
        handleAnnouncement("currBus");
    }, [handleAnnouncement]);


    // Effect
    useEffect(() => {
        if (focusBlankRef.current) {
            focusBlankRef.current.focus();
        }
    }, []);


    // Render
    return (
        <Wrapper {...handleHorizontalSwiper}>
            <LoadingAnimation active={isLoading} />
            <BusInfoContainer ref={busInfoContainer}>
                <Swiper
                    slidesPerView={1}
                    spaceBetween={50}
                    onInit={() => { buses.length <= 1 && handleAnnouncement("currBus"); }}
                    onSlideChange={handleSlideChange}
                    speed={300}
                    loop={buses.length > 1 ? true : false}
                    direction="vertical"
                    style={{ height: "100%", width: "100%" }}
                >
                    {buses.map((bus, index) => (
                        <SwiperSlide key={index} style={{ height: "100%", width: "100%" }}>
                            <BusInfo
                                onClick={handleBusInfoClick}
                                tabIndex={1}
                            >
                                <BusName>{bus.busRouteAbrv || bus.busRouteNm}</BusName>
                                <BusAdirection>{`${bus.adirection} 방면`}</BusAdirection>
                            </BusInfo>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </BusInfoContainer>
            <FocusBlank ref={focusBlankRef} tabIndex={0} />
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


const BusInfoContainer = styled.div`
    height: 90%;
    width: 85%;
    border: 1px solid var(--main-border-color);
    border-radius: 8px;
    background-color: var(--main-color);
    color: var(--main-font-color);
`;


const BusInfo = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;


const BusName = styled.h1` 
    text-align: center;
    margin-bottom: 4vw;
    font-size: 6.5vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;

const BusAdirection = styled.h3`
    text-align: center;
    font-size: 4vw;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
`;