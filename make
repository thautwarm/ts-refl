#!/usr/bin/env python

from pmakefile import *

phony(["install"])


def exe_suffix():
    os = get_os()
    if os == 'windows':
        return 'win.exe'
    return os

dist_path = f'dist/tspi-{exe_suffix()}'
node_modules = 'node_modules'

@recipe(name=node_modules)
def setup_deps():
    """
    Install node dependencies
    """
    from subprocess import run
    log(f'Installing dependencies')
    run(['pnpm', 'install'])
    log('Dpendencies installed')


@recipe(node_modules, name=dist_path)
def exe_name():
    """
    Get the name of the executable
    """
    log(f"Building {dist_path}")
    from subprocess import run
    run(["pnpm", "dist"])
    log(f"{dist_path} Built", level='ok')

@recipe(dist_path)
def install():
    """
    Install the built executable to ~/.local/bin/tspi
    """
    data = Path(dist_path).read_bytes()
    where = Path.home().joinpath(".local/bin/tspi")
    if get_os() == 'windows':
        where = where.with_suffix('.exe')

    where.write_bytes(data)

    # change chmod to u+x
    if get_os() != 'windows':
        where.chmod(0o755)

    log(f"Installed to {where}", level='ok')

make()
