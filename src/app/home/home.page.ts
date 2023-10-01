import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit{
  itens: any[] = []
  constructor() {}

  ngOnInit(): void {
    this.itens = [
      {
        qtd: 10,
        descricao: 'Arroz'
      },
      {
        qtd: 12,
        descricao: 'Feijão'
      },
      {
        qtd: 3,
        descricao: 'Açucar'
      }
    ]
  }
}
