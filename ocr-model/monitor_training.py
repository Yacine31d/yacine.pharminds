import json
import time
import os
from rich.live import Live
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.console import Console
from rich.progress import Progress, BarColumn, TextColumn
from rich import box

console = Console()

def make_layout():
    layout = Layout()
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="main", size=10),
        Layout(name="footer", size=3),
    )
    return layout

class Header:
    def __rich__(self) -> Panel:
        grid = Table.grid(expand=True)
        grid.add_column(justify="center", ratio=1)
        grid.add_row("[bold magenta]PharMinds[/bold magenta] [cyan]TrOCR Training Monitor[/cyan]")
        return Panel(grid, style="white on blue")

def generate_table(stats):
    table = Table(box=box.ROUNDED, expand=True)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="bold yellow")
    
    table.add_row("Step", f"{stats.get('step', 0)} / {stats.get('max_steps', '?')}")
    table.add_row("Epoch", f"{stats.get('epoch', 0):.2f}")
    table.add_row("Loss", f"{stats.get('loss', 0):.4f}")
    table.add_row("Learning Rate", f"{stats.get('learning_rate', 0):.2e}")
    table.add_row("Eval Loss", f"{stats.get('eval_loss', 0):.4f}")
    table.add_row("Eval CER", f"{stats.get('eval_cer', 0):.4f}")
    
    return table

def main():
    layout = make_layout()
    layout["header"].update(Header())
    
    stats_file = "ocr-model/training_live.json"
    
    with Live(layout, refresh_per_second=1, screen=True):
        while True:
            if os.path.exists(stats_file):
                try:
                    with open(stats_file, "r") as f:
                        stats = json.load(f)
                    
                    layout["main"].update(
                        Panel(generate_table(stats), title="[bold green]Live Metrics[/bold green]")
                    )
                    
                    # Progress Bar logic
                    step = stats.get("step", 0)
                    max_steps = stats.get("max_steps", 1)
                    progress = (step / max_steps) * 100 if max_steps > 0 else 0
                    
                    layout["footer"].update(
                        Panel(f"[bold white]Overall Progress: {progress:.1f}%[/bold white]", border_style="cyan")
                    )
                except Exception:
                    pass
            else:
                layout["main"].update(Panel("[yellow]Waiting for training to start / first log step...[/yellow]"))
            
            time.sleep(1)

if __name__ == "__main__":
    main()
