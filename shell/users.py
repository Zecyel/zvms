from shell import App
from req import req,headers
from util import md5ify, search

AUTH = {
    0b1: '无',
    0b10: '学生',
    0b100: '教师',
    0b1000: '支书',
    0b10000: '管理员',
    0b100000: '审计员',
    0b1000000: '系统'
}

def auth2str(auth):
    return ','.join((v for k, v in AUTH.items() if k & auth))

users = App('users', '用户管理:')

@users.route('user login <int:id> <pwd>')
def login(id, pwd):
    '''登录'''
    res = req.post('/users/login', id=id, pwd=md5ify(pwd))
    if res:
        headers['Authorization'] = res['token']
        App.config['prompt'] = f'{id}> '

@users.route('user logout')
def logout():
    '''登出'''
    req.post('/users/logout')
    headers['Authorization'] = ''
    App.config['prompt'] = '(未登录)> '

@users.route('user -n <name> -a <int:auth>')
def search_users(**kwargs):
    res = req.get(f'/users?{search(kwargs)}')
    if res:
        for i in res:
            print(i['id'], i['name'])

@users.route('user <int:id>')
def get_user_info(id):
    '''获取一个用户的详细信息'''
    res = req.get(f'/users/{id}')
    if res:
        print('''姓名: {name}
班级: {cls}({clsName})
权限: {auth_str}'''.format(**res, auth_str=auth2str(res['auth'])))
        if res['auth'] & 0b10:
            print('''校内时间: {inside}
校外时间: {outside}
大型时间: {large}'''.format(**res))

@users.route('user mod-pwd <old> <new>')
def modify_password(old, new):
    '''修改自己的密码'''
    req.patch('/users/mod-pwd', old=md5ify(old), new=md5ify(new))

@users.route('user change-class <cls>')
def change_class(cls):
    '''修改自己(老师)的班级'''
    req.patch('/users/change-class', cls=cls)

@users.route('user create *users int:id name int:cls int:auth pwd')
def create_users(users):
    '''创建一批用户'''
    for user in users:
        user['pwd'] = md5ify(user['pwd'])
    req.post('/users', users=users)

@users.route('user delete <int:id>')
def delete_user(id):
    '''删除一个用户'''
    req.delete(f'/users/{id}')

@users.route('user modify <int:id> <name> <int:cls> <int:auth>')
def modify_user(id, name, auth, cls):
    '''修改一个用户'''
    req.put(f'/users/{id}', name=name, cls=cls, auth=auth)