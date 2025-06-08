import { Module } from '@nestjs/common';
import { WsGatewayService } from './wsgateway.service';

@Module({
  providers: [WsGatewayService],
  exports: [WsGatewayService], // 👈 Export để module khác dùng được
})
export class WsgatewayModule {}
