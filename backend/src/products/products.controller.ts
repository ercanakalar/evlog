import { Controller, Get, Headers, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LookupQueryDto } from './dto/lookup.dto';
import { productLanguage } from './product-matcher';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Category and shelf life for a product name, e.g. while editing a receipt line. */
  @Get('lookup')
  lookup(@Query() query: LookupQueryDto, @Headers('accept-language') language?: string) {
    return this.products.match(query.name, productLanguage(language));
  }
}
