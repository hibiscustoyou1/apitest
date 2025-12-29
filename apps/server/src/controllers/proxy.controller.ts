import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import { ApiResponse, ApiCode, ProxyRequestDto, ProxyResponseDto } from '@repo/shared';

export const handleProxyRequest = async (
  req: Request<{}, {}, ProxyRequestDto>,
  res: Response<ApiResponse<ProxyResponseDto>>
) => {
  const { method, url, headers, body } = req.body;
  const startTime = Date.now();
  
  try {
    const response = await axios({
      method,
      url,
      headers: headers || {},
      data: body,
      validateStatus: () => true, // 任何状态码都视为成功，由前端展示
    });
    
    const endTime = Date.now();
    
    res.json({
      code: ApiCode.SUCCESS,
      data: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as any,
        data: response.data,
        timeTaken: endTime - startTime
      }
    });
  } catch (error) {
    const err = error as AxiosError;
    res.status(500).json({
      code: ApiCode.FAIL,
      msg: err.message || 'Proxy Request Failed'
    });
  }
};
