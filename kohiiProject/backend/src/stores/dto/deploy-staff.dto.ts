export class DeployStaffDto {
  /** Mga staff na ide-deploy sa store na ito, kasama ang shift nila (AM o PM) */
  staff!: { userId: number; shift?: string }[];
}
