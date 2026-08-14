import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('elo_configs')
export class EloConfig {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ type: 'int', default: 1300 })
  baseRating: number;

  @Column({ type: 'int', default: 900 })
  floor: number;

  @Column({ type: 'int', default: 1600 })
  ceiling: number;

  @Column({ type: 'jsonb', default: () => `'[{"minMatches":0,"k":64},{"minMatches":6,"k":48},{"minMatches":11,"k":32},{"minMatches":31,"k":24}]'` })
  kFactorTable: Array<{ minMatches: number; k: number }>;

  @Column({ type: 'jsonb', default: () => `'{"BEST_OF_3":1.0,"SINGLE_GAME_21":0.7}'` })
  formatWeights: Record<string, number>;

  @Column({ type: 'jsonb', default: () => `'[{"meetings":1,"weight":1.0},{"meetings":3,"weight":0.75},{"meetings":4,"weight":0.5},{"meetings":5,"weight":0.2}]'` })
  repeatedOpponentWeights: Array<{ meetings: number; weight: number }>;

  @Column({ type: 'int', default: 10 })
  provisionalMatches: number;

  @Column({ type: 'int', default: 10 })
  leaderboardMinMatches: number;

  @Column({ type: 'int', default: 6 })
  leaderboardMinOpponents: number;

  @Column({ type: 'int', default: 350 })
  initialDeviation: number;

  @Column({ type: 'int', default: 20 })
  deviationStep: number;

  @Column({ type: 'int', default: 50 })
  deviationFloor: number;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
