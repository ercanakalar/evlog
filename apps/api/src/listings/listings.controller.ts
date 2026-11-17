import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AddBrokerDto, LinkListingDto, UpdateListingDto } from './dto/listing.dto';
import { ListingsService } from './listings.service';

@ApiTags('listings')
@ApiBearerAuth()
@Controller()
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get('homes/:homeId/listings')
  list(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.listings.list(homeId, user.id);
  }

  /** Owner links a sahibinden.com listing to the home. */
  @Post('homes/:homeId/listings')
  link(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: LinkListingDto,
  ) {
    return this.listings.link(homeId, user.id, dto);
  }

  @Post('listings/:listingId/sync')
  @HttpCode(200)
  sync(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.sync(listingId, user.id);
  }

  /** Choose what brokers can see. */
  @Patch('listings/:listingId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(listingId, user.id, dto);
  }

  @Delete('listings/:listingId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.remove(listingId, user.id);
  }

  @Post('listings/:listingId/brokers')
  addBroker(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() dto: AddBrokerDto,
  ) {
    return this.listings.addBroker(listingId, user.id, dto);
  }

  @Delete('listings/:listingId/brokers/:brokerId')
  @HttpCode(204)
  revokeBroker(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('brokerId', ParseUUIDPipe) brokerId: string,
  ) {
    return this.listings.revokeBroker(listingId, brokerId, user.id);
  }

  @Post('listings/:listingId/send-update')
  @HttpCode(200)
  sendUpdate(
    @CurrentUser() user: AuthUser,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.listings.sendUpdate(listingId, user.id);
  }
}

/** Read-only pages for real-estate brokers, authorised by the share token. */
@ApiTags('shared')
@Public()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('shared/listings/:token')
export class SharedListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  view(@Param('token') token: string) {
    return this.listings.sharedView(token);
  }

  @Get('photos/:photoId')
  async photo(
    @Param('token') token: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    const { stream, mimeType } = await this.listings.sharedPhoto(token, photoId);
    return new StreamableFile(stream, { type: mimeType, disposition: 'inline' });
  }
}
