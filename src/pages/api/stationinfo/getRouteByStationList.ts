import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import axios from 'axios';

interface ApiResponse {
    comMsgHeader: ComMsgHeader;
    msgHeader: MsgHeader;
    msgBody: MsgBody;
}

interface ComMsgHeader {
    errMsg: string | null;
    requestMsgID: string | null;
    responseMsgID: string | null;
    responseTime: string | null;
    successYN: string | null;
    returnCode: string | null;
}

interface MsgHeader {
    headerMsg: string;
    headerCd: string;
    itemCount: number;
}

interface MsgBody {
    itemList: BusRouteInfo[];
}

interface BusRouteInfo {
    busRouteId: string;
    busRouteNm: string;
    busRouteAbrv: string;
    length: string;
    busRouteType: string;
    stBegin: string;
    stEnd: string;
    term: string;
    nextBus: string;
    firstBusTm: string;
    lastBusTm: string;
    firstBusTmLow: string;
    lastBusTmLow: string;
}


export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const session = await getServerSession(request, response, authOptions);

    switch (request.method) {
        case "GET": {
            if (!session) {
                response.status(401).json({ msg: "Unauthorized: 세션이 없습니다.", itemList: [] });
                break;
            }

            try {
                const requestParam = request.query;
                const responseData = await axios.get<ApiResponse>(
                    "http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation",
                    {
                        params: {
                            serviceKey: decodeURIComponent(process.env.DATA_API_ENCODING),
                            arsId: requestParam.arsId,
                            resultType: "json"
                        }
                    }
                );
                const { comMsgHeader, msgHeader, msgBody } = responseData.data;

                if (comMsgHeader.errMsg) {
                    response.status(500).json({ msg: msgHeader.headerMsg, itemList: [] });
                } else {
                    response.status(200).json({ msg: msgHeader.headerMsg, itemList: msgBody.itemList });
                }
            } catch (error) {
                response.status(502).json({ msg: "API 요청 중 오류가 발생했습니다.", itemList: [] });
            }
            break;
        }
        default: {
            response.status(405).json({ msg: "지원하지 않는 메서드입니다.", itemList: [] });
            break;
        }
    }
}