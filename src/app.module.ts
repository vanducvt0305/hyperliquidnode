import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DeletefileService } from './deletefile/deletefile.service';
import { HandledataService } from './handledata/handledata.service';
import { WsgatewayService } from './wsgateway/wsgateway.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DeletefileService, HandledataService, WsgatewayService],
})
export class AppModule {}
