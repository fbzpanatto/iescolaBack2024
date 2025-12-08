import { NextFunction, Request, Response } from "express";
import { DeviceCheckResult } from "../interfaces/interfaces";

export default (req: Request, res: Response, next: NextFunction) => {
  try {

    const result = checkIfMobileDevice(req);

    if (result.isMobile && result.confidence !== 'low') {
      // logMobileAccessAttempt(req, result);
      res.status(403).json({
        status: 403,
        message: 'Provas só podem ser realizadas em computadores desktop.',
        error: 'MOBILE_ACCESS_DENIED',
        code: 'DEVICE_NOT_ALLOWED',
        details: process.env.NODE_ENV === 'development' ? { confidence: result.confidence, reasons: result.reasons } : undefined
      });
      return;
    }
    next()
  }
  catch (error: any) { console.log(error); return res.status(500).json({ message: error.message }) }
}

function checkIfMobileDevice(req: Request): DeviceCheckResult {
  const userAgent = req.headers['user-agent'] || '';

  const reasons: string[] = [];
  let mobileIndicators = 0;

  // 1. Verificação de User-Agent (principal)
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  if (mobileRegex.test(userAgent)) {
    mobileIndicators++;
    reasons.push('User-Agent indica dispositivo móvel');
  }

  // 2. Client Hints - Viewport Width
  const viewportWidth = req.headers['sec-ch-viewport-width'] as string;
  if (viewportWidth) {
    const width = parseInt(viewportWidth);
    if (!isNaN(width) && width < 768) {
      mobileIndicators++;
      reasons.push(`Largura de viewport reduzida: ${width}px`);
    }
  }

  // 3. Client Hints - Mobile flag
  const uaMobile = req.headers['sec-ch-ua-mobile'] as string;
  if (uaMobile === '?1') {
    mobileIndicators++;
    reasons.push('Header sec-ch-ua-mobile indica dispositivo móvel');
  }

  // 4. Client Hints - Platform
  const platform = (req.headers['sec-ch-ua-platform'] as string)?.toLowerCase();
  if (platform) {
    const mobilePlatforms = ['android', 'ios', 'ipados'];
    if (mobilePlatforms.some(p => platform.includes(p))) {
      mobileIndicators++;
      reasons.push(`Plataforma móvel detectada: ${platform}`);
    }
  }

  // 5. Verificação de conexão (opcional, pode indicar mobile)
  // const downlink = req.headers['downlink'] as string;
  // if (downlink) {
  //   const speed = parseFloat(downlink);
  //   if (!isNaN(speed) && speed < 2) {
  //     reasons.push(`Conexão lenta detectada: ${speed} Mbps (possível rede móvel)`);
  //   }
  // }

  // 6. Accept header - alguns browsers mobile têm padrões específicos
  const accept = req.headers['accept'] || '';
  if (accept.includes('application/vnd.wap.xhtml+xml')) {
    mobileIndicators++;
    reasons.push('Accept header indica WAP/mobile');
  }

  const isMobile = mobileIndicators >= 1;
  const confidence: 'high' | 'medium' | 'low' = mobileIndicators >= 3 ? 'high' : mobileIndicators === 2 ? 'medium' : mobileIndicators === 1 ? 'medium' : 'low';

  return { isMobile, confidence, reasons, userAgent, timestamp: new Date() }
}