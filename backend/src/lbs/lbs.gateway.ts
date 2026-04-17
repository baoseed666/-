import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LbsService } from './lbs.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/lbs' })
export class LbsGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly lbs: LbsService) {}

  @SubscribeMessage('request-match')
  async handleRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      userId: string;
      lat: number;
      lng: number;
      tags: string[];
      shopId?: string;
    },
  ) {
    await this.lbs.joinMatchPool(
      data.userId,
      data.lat,
      data.lng,
      data.tags,
      client.id,
      data.shopId,
    );
    const match = await this.lbs.findMatch(
      data.userId,
      data.lat,
      data.lng,
      data.tags,
    );

    if (match) {
      this.server
        .to(match.requesterSocketId)
        .emit('matched', { matchedUserId: data.userId });
      client.emit('matched', { matchedUserId: match.userId });
      await this.lbs.confirmMatch(data.userId, match.userId);
    } else {
      client.emit('waiting', { message: '正在寻找附近的省钱伙伴...' });
    }
  }

  @SubscribeMessage('cancel-match')
  async handleCancel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    await this.lbs.cancelRequest(data.userId);
    client.emit('cancelled', {});
  }
}
