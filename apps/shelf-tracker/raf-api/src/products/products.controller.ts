import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LookupQueryDto } from './dto/lookup.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** Category and shelf life for a product name, e.g. while editing a receipt line. */
  @Get('lookup')
  lookup(@Query() query: LookupQueryDto) {
    return this.products.match(query.name);
  }
}
