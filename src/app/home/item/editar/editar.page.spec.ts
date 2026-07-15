import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { EditarPage } from './editar.page';
import { ItemService } from '../item.service';

describe('EditarPage', () => {
  let component: EditarPage;
  let fixture: ComponentFixture<EditarPage>;

  beforeEach(async () => {
    const activatedRouteMock = {
      paramMap: of({
        has: (key: string) => false,
        get: (key: string) => null
      })
    };

    const itemServiceMock = {
      getbyId: () => null,
      getTodos: () => []
    };

    await TestBed.configureTestingModule({
      declarations: [EditarPage],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: ItemService, useValue: itemServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
